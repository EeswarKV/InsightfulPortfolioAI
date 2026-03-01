"""
Background scheduler for push notifications.

Jobs (all times IST = UTC+5:30):
  - Market news broadcast    → every 2 h during trading hours (9:15, 11:15, 13:15, 15:15 IST)
  - Daily portfolio summary  → 9:00 AM IST (3:30 AM UTC)
  - Holdings news alerts     → 8:00 AM IST (2:30 AM UTC)
  - Weekly performance report → Monday 9:00 AM IST (Monday 3:30 AM UTC)
"""
import asyncio
import logging
from datetime import datetime, timezone, timedelta

import httpx
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.services.push_service import send_push
from app.services.supabase_client import get_supabase_admin
from app.config import settings

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler(timezone="UTC")

GOOGLE_NEWS_BASE = "https://news.google.com/rss/search"
COMMON_HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; PortfolioAI/1.0)"}

# Tracks article titles already pushed for market news (resets on restart — acceptable)
_seen_market_news: set[str] = set()


# ── Helpers ────────────────────────────────────────────────────────────────────

def _fmt_inr(value: float) -> str:
    """Format a rupee amount compactly (e.g. ₹12.3L, ₹1.2Cr)."""
    if value >= 1_00_00_000:
        return f"₹{value / 1_00_00_000:.1f}Cr"
    if value >= 1_00_000:
        return f"₹{value / 1_00_000:.1f}L"
    return f"₹{value:,.0f}"


async def _get_kite_quotes(symbols: list[str]) -> dict:
    """Fetch quotes for NSE symbols from Kite REST API. Returns {symbol: quote_data}."""
    api_key = settings.kite_api_key
    access_token = settings.kite_access_token
    if not api_key or not access_token:
        return {}
    headers = {
        "X-Kite-Version": "3",
        "Authorization": f"token {api_key}:{access_token}",
    }
    kite_syms = [f"NSE:{s}" for s in symbols]
    # Kite allows 500 per request
    batches = [kite_syms[i:i + 500] for i in range(0, len(kite_syms), 500)]

    async def _fetch_batch(batch: list[str]) -> dict:
        params = [("i", sym) for sym in batch]
        try:
            async with httpx.AsyncClient(headers=headers, timeout=20) as client:
                resp = await client.get("https://api.kite.trade/quote", params=params)
            if resp.status_code != 200:
                return {}
            return resp.json().get("data", {})
        except Exception:
            return {}

    results = await asyncio.gather(*[_fetch_batch(b) for b in batches])
    merged: dict = {}
    for r in results:
        merged.update(r)
    return merged


async def _fetch_google_news(query: str) -> list[dict]:
    """Fetch articles from Google News RSS. Returns list of {title, published_at}."""
    import xml.etree.ElementTree as ET
    from urllib.parse import quote
    from email.utils import parsedate_to_datetime

    url = f"{GOOGLE_NEWS_BASE}?q={quote(query)}&hl=en-IN&gl=IN&ceid=IN:en"
    try:
        async with httpx.AsyncClient(timeout=10, headers=COMMON_HEADERS, follow_redirects=True) as client:
            resp = await client.get(url)
        if resp.status_code != 200:
            return []
        root = ET.fromstring(resp.text)
        channel = root.find("channel") or root
        articles = []
        for item in channel.findall("item"):
            title = (item.findtext("title") or "").strip()
            pub_raw = (item.findtext("pubDate") or "").strip()
            try:
                pub_dt = parsedate_to_datetime(pub_raw).astimezone(timezone.utc)
            except Exception:
                pub_dt = datetime.now(timezone.utc)
            if title:
                articles.append({"title": title, "published_at": pub_dt})
        return articles
    except Exception:
        return []


# ── Jobs ───────────────────────────────────────────────────────────────────────

async def job_market_news():
    """Broadcast fresh market news headlines to all users with push tokens."""
    global _seen_market_news
    logger.info("[scheduler] Running market news broadcast job")

    articles = await _fetch_google_news("Indian stock market NSE BSE Sensex Nifty")
    if not articles:
        return

    # Find articles we haven't pushed yet
    new_articles = [a for a in articles if a["title"] not in _seen_market_news]
    if not new_articles:
        return

    # Mark all current articles as seen (keep set bounded to avoid unbounded growth)
    _seen_market_news = {a["title"] for a in articles}

    # Take top new headline
    top = new_articles[0]
    title = top["title"]
    if " - " in title:
        title = title.rsplit(" - ", 1)[0]
    title = title[:100]

    count = len(new_articles)
    body = title if count == 1 else f"{title} (+{count - 1} more)"

    # Fetch all push tokens in one query and broadcast to everyone
    supabase = get_supabase_admin()
    result = supabase.table("push_tokens").select("token").execute()
    all_tokens = [row["token"] for row in (result.data or [])]
    if not all_tokens:
        return

    await send_push(all_tokens, "Market News 📰", body, {"screen": "news"})
    logger.info("[scheduler] Market news broadcast sent to %d tokens", len(all_tokens))


async def job_daily_summary():
    """Send each user a morning summary of their portfolio value."""
    logger.info("[scheduler] Running daily portfolio summary job")
    supabase = get_supabase_admin()

    # Get all users with at least one push token
    tokens_result = supabase.table("push_tokens").select("user_id, token").execute()
    if not tokens_result.data:
        return

    # Group tokens by user
    user_tokens: dict[str, list[str]] = {}
    for row in tokens_result.data:
        user_tokens.setdefault(row["user_id"], []).append(row["token"])

    for user_id, tokens in user_tokens.items():
        try:
            # Fetch all holdings for this user via their portfolios
            portfolios_result = (
                supabase.table("portfolios")
                .select("id")
                .eq("client_id", user_id)
                .execute()
            )
            if not portfolios_result.data:
                continue

            portfolio_ids = [p["id"] for p in portfolios_result.data]
            holdings_result = (
                supabase.table("holdings")
                .select("symbol, quantity, average_price")
                .in_("portfolio_id", portfolio_ids)
                .execute()
            )
            if not holdings_result.data:
                continue

            holdings = holdings_result.data
            symbols = list({h["symbol"] for h in holdings})
            quotes = await _get_kite_quotes(symbols)

            total_value = 0.0
            total_invested = 0.0
            for h in holdings:
                sym = h["symbol"]
                qty = float(h.get("quantity", 0))
                avg = float(h.get("average_price", 0))
                quote_data = quotes.get(f"NSE:{sym}", {})
                ltp = float(quote_data.get("last_price", avg))
                total_value += ltp * qty
                total_invested += avg * qty

            if total_invested == 0:
                continue

            day_pct = ((total_value - total_invested) / total_invested) * 100
            arrow = "📈" if day_pct >= 0 else "📉"
            sign = "+" if day_pct >= 0 else ""
            body = f"{_fmt_inr(total_value)} · {sign}{day_pct:.1f}% overall {arrow}"

            await send_push(tokens, "Good morning! Portfolio update", body, {"screen": "portfolio"})
        except Exception as exc:
            logger.error("[scheduler] daily_summary error for user %s: %s", user_id, exc)


async def job_news_alerts():
    """Send users news headlines for their top holdings."""
    logger.info("[scheduler] Running news alerts job")
    supabase = get_supabase_admin()

    tokens_result = supabase.table("push_tokens").select("user_id, token").execute()
    if not tokens_result.data:
        return

    user_tokens: dict[str, list[str]] = {}
    for row in tokens_result.data:
        user_tokens.setdefault(row["user_id"], []).append(row["token"])

    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)

    for user_id, tokens in user_tokens.items():
        try:
            portfolios_result = (
                supabase.table("portfolios")
                .select("id")
                .eq("client_id", user_id)
                .execute()
            )
            if not portfolios_result.data:
                continue

            portfolio_ids = [p["id"] for p in portfolios_result.data]
            holdings_result = (
                supabase.table("holdings")
                .select("symbol, quantity")
                .in_("portfolio_id", portfolio_ids)
                .execute()
            )
            if not holdings_result.data:
                continue

            # Top 5 symbols by quantity
            sorted_holdings = sorted(
                holdings_result.data,
                key=lambda h: float(h.get("quantity", 0)),
                reverse=True,
            )
            top_symbols = [h["symbol"] for h in sorted_holdings[:5]]

            # Fetch news for each symbol concurrently
            tasks = [_fetch_google_news(f"{sym} NSE India stock") for sym in top_symbols]
            all_articles_nested = await asyncio.gather(*tasks)

            recent_headlines: list[str] = []
            for articles in all_articles_nested:
                for article in articles[:2]:
                    if article["published_at"] >= cutoff:
                        # Strip " - Publisher" suffix if present
                        title = article["title"]
                        if " - " in title:
                            title = title.rsplit(" - ", 1)[0]
                        recent_headlines.append(title)

            if not recent_headlines:
                continue

            headline = recent_headlines[0][:100]
            count = len(recent_headlines)
            body = headline if count == 1 else f"{headline} (+{count - 1} more)"

            await send_push(tokens, "Market News", body, {"screen": "news"})
        except Exception as exc:
            logger.error("[scheduler] news_alerts error for user %s: %s", user_id, exc)


async def job_weekly_report():
    """Send users a weekly performance report (runs Monday morning)."""
    logger.info("[scheduler] Running weekly report job")
    supabase = get_supabase_admin()

    tokens_result = supabase.table("push_tokens").select("user_id, token").execute()
    if not tokens_result.data:
        return

    user_tokens: dict[str, list[str]] = {}
    for row in tokens_result.data:
        user_tokens.setdefault(row["user_id"], []).append(row["token"])

    for user_id, tokens in user_tokens.items():
        try:
            portfolios_result = (
                supabase.table("portfolios")
                .select("id")
                .eq("client_id", user_id)
                .execute()
            )
            if not portfolios_result.data:
                continue

            portfolio_ids = [p["id"] for p in portfolios_result.data]
            holdings_result = (
                supabase.table("holdings")
                .select("symbol, quantity, average_price")
                .in_("portfolio_id", portfolio_ids)
                .execute()
            )
            if not holdings_result.data:
                continue

            holdings = holdings_result.data
            symbols = list({h["symbol"] for h in holdings})
            quotes = await _get_kite_quotes(symbols)

            total_value = 0.0
            total_invested = 0.0
            for h in holdings:
                sym = h["symbol"]
                qty = float(h.get("quantity", 0))
                avg = float(h.get("average_price", 0))
                quote_data = quotes.get(f"NSE:{sym}", {})
                ltp = float(quote_data.get("last_price", avg))
                total_value += ltp * qty
                total_invested += avg * qty

            if total_invested == 0:
                continue

            overall_pct = ((total_value - total_invested) / total_invested) * 100
            arrow = "📈" if overall_pct >= 0 else "📉"
            sign = "+" if overall_pct >= 0 else ""
            body = f"{_fmt_inr(total_value)} · {sign}{overall_pct:.1f}% overall {arrow}"

            await send_push(tokens, "Weekly Portfolio Report", body, {"screen": "portfolio"})
        except Exception as exc:
            logger.error("[scheduler] weekly_report error for user %s: %s", user_id, exc)


# ── Lifecycle ──────────────────────────────────────────────────────────────────

def start_scheduler():
    """Register jobs and start the scheduler. Call from app lifespan startup."""
    # Market news: 9:15, 11:15, 13:15, 15:15 IST = 3:45, 5:45, 7:45, 9:45 UTC, Mon–Fri
    for hour_utc in (3, 5, 7, 9):
        scheduler.add_job(
            job_market_news,
            trigger="cron",
            hour=hour_utc,
            minute=45,
            day_of_week="mon-fri",
            id=f"market_news_{hour_utc}",
            replace_existing=True,
        )
    # Daily summary: 9:00 AM IST = 3:30 AM UTC, Mon–Fri
    scheduler.add_job(
        job_daily_summary,
        trigger="cron",
        hour=3,
        minute=30,
        day_of_week="mon-fri",
        id="daily_summary",
        replace_existing=True,
    )
    # News alerts: 8:00 AM IST = 2:30 AM UTC, Mon–Fri
    scheduler.add_job(
        job_news_alerts,
        trigger="cron",
        hour=2,
        minute=30,
        day_of_week="mon-fri",
        id="news_alerts",
        replace_existing=True,
    )
    # Weekly report: Monday 9:00 AM IST = Monday 3:30 AM UTC
    scheduler.add_job(
        job_weekly_report,
        trigger="cron",
        day_of_week="mon",
        hour=3,
        minute=30,
        id="weekly_report",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("[scheduler] Started — market news (4×/day), daily summary, holdings news, weekly report")


def stop_scheduler():
    """Stop the scheduler gracefully. Call from app lifespan shutdown."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("[scheduler] Stopped")
