"""
Background scheduler for push notifications.

Jobs (all times IST = UTC+5:30):
  - Market news broadcast     → every 15 min, 24/7
  - Results & earnings news   → every 15 min, 24/7
  - Portfolio holdings news   → every 15 min, 24/7
  - Daily portfolio summary   → 9:00 AM IST (3:30 AM UTC)
  - Weekly performance report → Monday 9:00 AM IST (Monday 3:30 AM UTC)
"""
import asyncio
import logging
import xml.etree.ElementTree as ET
from datetime import datetime, timezone, timedelta
from email.utils import parsedate_to_datetime

import httpx
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.services.push_service import send_push
from app.services.supabase_client import get_supabase_admin
from app.config import settings

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler(timezone="UTC")

# Same Indian publisher RSS feeds used by the news.py router — ensures notifications
# match the articles users actually see in the app's News tab.
MARKET_FEEDS = [
    "https://economictimes.indiatimes.com/markets/rss.cms",
    "https://www.moneycontrol.com/rss/buzzingstocks.xml",
    "https://www.livemint.com/rss/markets",
    "https://www.business-standard.com/rss/markets-106.rss",
    "https://www.financialexpress.com/market/feed/",
]

RESULTS_FEEDS = [
    "https://economictimes.indiatimes.com/markets/earnings/rss.cms",
    "https://www.moneycontrol.com/rss/results.xml",
    "https://www.business-standard.com/rss/companies-101.rss",
    "https://www.livemint.com/rss/companies",
]

COMMON_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/rss+xml, application/xml, text/xml, */*",
    "Accept-Language": "en-IN,en;q=0.9",
}

# In-session dedup sets — reset on server restart; the 45-min timestamp filter is the
# primary guard against re-notifying after a restart.
_seen_market_news: set[str] = set()
_seen_results_news: set[str] = set()
_seen_holdings_news: set[str] = set()

# WebSocket real-time news broadcast — separate seen set + init flag
_seen_ws_news: set[str] = set()
_ws_news_initialized: bool = False


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


async def _fetch_rss_articles(feed_url: str) -> list[dict]:
    """
    Fetch and parse one RSS feed URL.
    Returns list of {title: str, url: str, published_at: datetime (UTC)}.
    """
    try:
        async with httpx.AsyncClient(timeout=12, headers=COMMON_HEADERS, follow_redirects=True) as client:
            resp = await client.get(feed_url)
        if resp.status_code != 200:
            return []
        root = ET.fromstring(resp.text)
        channel = root.find("channel") or root
        articles = []
        for item in channel.findall("item"):
            title_raw = (item.findtext("title") or "").strip()
            article_url = (item.findtext("link") or "").strip()
            pub_raw = (item.findtext("pubDate") or "").strip()
            if not title_raw:
                continue
            # Strip " - Publisher" suffix for cleaner notification text
            if " - " in title_raw:
                title_raw = title_raw.rsplit(" - ", 1)[0]
            title = title_raw.strip()[:120]
            try:
                pub_dt = parsedate_to_datetime(pub_raw).astimezone(timezone.utc)
            except Exception:
                pub_dt = datetime.now(timezone.utc)
            articles.append({"title": title, "url": article_url, "published_at": pub_dt})
        return articles
    except Exception:
        return []


# ── Jobs ───────────────────────────────────────────────────────────────────────

async def _broadcast_news(
    seen_set: set[str],
    feeds: list[str],
    push_title: str,
    log_tag: str,
) -> set[str]:
    """
    Fetch multiple RSS feeds in parallel, filter to articles published in the last
    45 minutes, dedup against seen_set, and broadcast to all registered push tokens.

    The 45-minute window (vs 15-min scheduler interval) compensates for RSS pubDate
    inaccuracies — Indian publisher feeds often timestamp articles 15-30 min late.
    """
    batches = await asyncio.gather(*[_fetch_rss_articles(f) for f in feeds])

    # Merge and deduplicate across feeds
    merged: list[dict] = []
    seen_titles: set[str] = set()
    for batch in batches:
        for a in batch:
            if a["title"] not in seen_titles:
                seen_titles.add(a["title"])
                merged.append(a)

    if not merged:
        return seen_set

    # Only articles published in the last 45 minutes
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=45)
    recent = [a for a in merged if a["published_at"] >= cutoff]

    # In-session dedup — prevents re-sending the same article within one server session
    new_articles = [a for a in recent if a["title"] not in seen_set]

    # Always update seen_set to current feed contents so stale titles get pruned
    updated_seen = {a["title"] for a in merged}

    if not new_articles:
        return updated_seen

    top = new_articles[0]
    headline = top["title"][:100]
    count = len(new_articles)
    body = headline if count == 1 else f"{headline} (+{count - 1} more)"

    supabase = get_supabase_admin()
    result = supabase.table("push_tokens").select("token").execute()
    all_tokens = [row["token"] for row in (result.data or [])]
    if not all_tokens:
        logger.info("[scheduler] %s — no push tokens registered yet", log_tag)
        return updated_seen

    await send_push(all_tokens, push_title, body, {"screen": "news", "url": top.get("url", "")})
    logger.info("[scheduler] %s sent to %d tokens (%d new articles)", log_tag, len(all_tokens), count)
    return updated_seen


async def job_market_news():
    """Broadcast fresh market news headlines to all users with push tokens."""
    global _seen_market_news
    logger.info("[scheduler] Running market news job")
    _seen_market_news = await _broadcast_news(
        _seen_market_news,
        feeds=MARKET_FEEDS,
        push_title="Market News 📰",
        log_tag="market_news",
    )


async def job_results_news():
    """Broadcast fresh earnings/results news to all users with push tokens."""
    global _seen_results_news
    logger.info("[scheduler] Running results news job")
    _seen_results_news = await _broadcast_news(
        _seen_results_news,
        feeds=RESULTS_FEEDS,
        push_title="Results & Earnings 📊",
        log_tag="results_news",
    )


async def job_daily_summary():
    """Send each user a morning summary of their portfolio value."""
    logger.info("[scheduler] Running daily portfolio summary job")
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

            day_pct = ((total_value - total_invested) / total_invested) * 100
            arrow = "📈" if day_pct >= 0 else "📉"
            sign = "+" if day_pct >= 0 else ""
            body = f"{_fmt_inr(total_value)} · {sign}{day_pct:.1f}% overall {arrow}"

            await send_push(tokens, "Good morning! Portfolio update", body, {"screen": "portfolio"})
        except Exception as exc:
            logger.error("[scheduler] daily_summary error for user %s: %s", user_id, exc)


async def job_news_alerts():
    """
    Send users news about their top-held stocks.

    Fetches the same market + results RSS feeds used by the news screen,
    filters to articles published in the last 45 minutes, deduplicates
    in-session, then for each user finds articles mentioning their top
    5 holdings by quantity.
    """
    global _seen_holdings_news
    logger.info("[scheduler] Running news alerts job")
    supabase = get_supabase_admin()

    tokens_result = supabase.table("push_tokens").select("user_id, token").execute()
    if not tokens_result.data:
        return

    user_tokens: dict[str, list[str]] = {}
    for row in tokens_result.data:
        user_tokens.setdefault(row["user_id"], []).append(row["token"])

    # Fetch all feeds once — reused across all users to avoid redundant HTTP calls
    all_feed_urls = MARKET_FEEDS + RESULTS_FEEDS
    batches = await asyncio.gather(*[_fetch_rss_articles(url) for url in all_feed_urls])

    all_articles: list[dict] = []
    seen_titles: set[str] = set()
    for batch in batches:
        for a in batch:
            if a["title"] not in seen_titles:
                seen_titles.add(a["title"])
                all_articles.append(a)

    # Filter to last 45 minutes
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=45)
    recent_articles = [a for a in all_articles if a["published_at"] >= cutoff]

    # In-session dedup — only process articles not seen in a previous run this session
    new_articles = [a for a in recent_articles if a["title"] not in _seen_holdings_news]
    _seen_holdings_news = {a["title"] for a in all_articles}

    if not new_articles:
        return

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
            top_symbols = [h["symbol"].upper() for h in sorted_holdings[:5]]

            # Articles that mention one of the user's holdings in the title
            user_articles = [
                a for a in new_articles
                if any(sym.lower() in a["title"].lower() for sym in top_symbols)
            ]

            if not user_articles:
                continue

            headline = user_articles[0]["title"][:100]
            count = len(user_articles)
            body = headline if count == 1 else f"{headline} (+{count - 1} more)"

            await send_push(
                tokens,
                "Portfolio News",
                body,
                {"screen": "news", "url": user_articles[0].get("url", "")},
            )
            logger.info("[scheduler] news_alerts sent to user %s (%d articles)", user_id, count)
        except Exception as exc:
            logger.error("[scheduler] news_alerts error for user %s: %s", user_id, exc)


async def job_ws_news_broadcast():
    """
    Check all RSS feeds every 60 seconds and broadcast any new articles to all
    connected WebSocket clients. The mobile app fires a local notification
    immediately on receipt — no push token required, works while app is open.

    First run populates the seen set without broadcasting to avoid spamming users
    with all current articles on server start.
    """
    global _seen_ws_news, _ws_news_initialized

    all_feed_urls = MARKET_FEEDS + RESULTS_FEEDS
    batches = await asyncio.gather(*[_fetch_rss_articles(url) for url in all_feed_urls])

    # Merge and deduplicate across feeds
    all_articles: list[dict] = []
    seen_titles: set[str] = set()
    for batch in batches:
        for a in batch:
            if a["title"] not in seen_titles:
                seen_titles.add(a["title"])
                all_articles.append(a)

    if not _ws_news_initialized:
        # First run — record current articles as baseline, don't broadcast
        _seen_ws_news = {a["title"] for a in all_articles}
        _ws_news_initialized = True
        logger.info("[scheduler] ws_news_broadcast initialized with %d articles", len(_seen_ws_news))
        return

    new_articles = [a for a in all_articles if a["title"] not in _seen_ws_news]
    _seen_ws_news = {a["title"] for a in all_articles}

    if not new_articles:
        return

    from app.services.kite_service import kite_service
    payload = {
        "type": "news",
        "articles": [
            {"title": a["title"], "url": a.get("url", "")}
            for a in new_articles[:10]
        ],
    }
    await kite_service.manager.broadcast_all(payload)
    logger.info("[scheduler] ws_news_broadcast pushed %d new articles to WS clients", len(new_articles))


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
    # WS real-time news broadcast: every 60 seconds
    scheduler.add_job(
        job_ws_news_broadcast,
        trigger="interval",
        seconds=60,
        id="ws_news_broadcast",
        replace_existing=True,
    )
    # Market news: every 15 min, 24/7
    scheduler.add_job(
        job_market_news,
        trigger="cron",
        minute="*/15",
        id="market_news",
        replace_existing=True,
    )
    # Results & earnings news: every 15 min, 24/7
    scheduler.add_job(
        job_results_news,
        trigger="cron",
        minute="*/15",
        id="results_news",
        replace_existing=True,
    )
    # Portfolio holdings news: every 15 min, 24/7
    scheduler.add_job(
        job_news_alerts,
        trigger="cron",
        minute="*/15",
        id="news_alerts",
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
    logger.info(
        "[scheduler] Started — WS news broadcast every 60s, "
        "market/results/portfolio news every 15 min (Indian publisher RSS feeds), "
        "daily summary, weekly report"
    )


def stop_scheduler():
    """Stop the scheduler gracefully. Call from app lifespan shutdown."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("[scheduler] Stopped")
