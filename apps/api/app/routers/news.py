"""
News endpoints — Indian market news, company news, and financial results.

Sources:
  /news/market   → Economic Times Markets RSS feed (no API key needed)
  /news/company  → Yahoo Finance JSON search API via httpx (no numpy/yfinance)
  /news/results  → Economic Times Earnings RSS feed (no API key needed)
"""
import asyncio
import hashlib
import re
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

import httpx
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.dependencies import get_current_user

router = APIRouter()

ET_MARKETS_RSS = "https://economictimes.indiatimes.com/markets/rss.cms"
ET_EARNINGS_RSS = "https://economictimes.indiatimes.com/markets/earnings/rss.cms"

COMMON_HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; PortfolioAI/1.0)",
    "Accept": "application/json, text/xml, */*",
}


class NewsItem(BaseModel):
    id: str
    title: str
    summary: str
    url: str
    source: str
    published_at: str
    symbols: list[str]
    thumbnail: str | None


# ── Helpers ────────────────────────────────────────────────────────────────────

def _strip_html(text: str) -> str:
    text = re.sub(r"<[^>]+>", "", text)
    text = text.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
    text = text.replace("&quot;", '"').replace("&#39;", "'").replace("&nbsp;", " ")
    return text.strip()


def _make_id(value: str) -> str:
    return hashlib.md5(value.encode()).hexdigest()


def _parse_rss(xml_text: str, default_source: str) -> list[NewsItem]:
    items: list[NewsItem] = []
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError:
        return items

    channel = root.find("channel") or root
    for item in channel.findall("item"):
        title = _strip_html((item.findtext("title") or "").strip())
        url = (item.findtext("link") or "").strip()
        guid = (item.findtext("guid") or url).strip()
        summary = _strip_html((item.findtext("description") or "").strip())
        pub_raw = (item.findtext("pubDate") or "").strip()

        if not title or not url:
            continue

        try:
            pub_dt = parsedate_to_datetime(pub_raw)
            published_at = pub_dt.astimezone(timezone.utc).isoformat()
        except Exception:
            published_at = datetime.now(timezone.utc).isoformat()

        items.append(
            NewsItem(
                id=_make_id(guid),
                title=title,
                summary=summary[:300] if summary else "",
                url=url,
                source=default_source,
                published_at=published_at,
                symbols=[],
                thumbnail=None,
            )
        )

    return items


async def _fetch_rss(url: str, source: str, limit: int) -> list[NewsItem]:
    try:
        async with httpx.AsyncClient(timeout=10, headers=COMMON_HEADERS, follow_redirects=True) as client:
            resp = await client.get(url)
            if resp.status_code != 200:
                return []
        return _parse_rss(resp.text, source)[:limit]
    except Exception:
        return []


async def _fetch_yf_news(symbol_ns: str, limit: int) -> list[NewsItem]:
    """
    Fetch news from Yahoo Finance's search JSON API — no numpy required.
    symbol_ns should include the exchange suffix, e.g. 'RELIANCE.NS'
    """
    url = "https://query1.finance.yahoo.com/v1/finance/search"
    params = {
        "q": symbol_ns,
        "newsCount": limit,
        "quotesCount": 0,
        "lang": "en-US",
        "region": "IN",
    }
    try:
        async with httpx.AsyncClient(timeout=10, headers=COMMON_HEADERS, follow_redirects=True) as client:
            resp = await client.get(url, params=params)
            if resp.status_code != 200:
                return []
        data = resp.json()
        raw_news = data.get("news") or []
    except Exception:
        return []

    base_sym = symbol_ns.split(".")[0].upper()
    items: list[NewsItem] = []
    for item in raw_news:
        title = (item.get("title") or "").strip()
        link = (item.get("link") or "").strip()
        if not title or not link:
            continue

        pub_ts = item.get("providerPublishTime", 0)
        try:
            published_at = datetime.fromtimestamp(pub_ts, tz=timezone.utc).isoformat()
        except Exception:
            published_at = datetime.now(timezone.utc).isoformat()

        source = item.get("publisher", "Yahoo Finance")

        thumbnail: str | None = None
        thumb = item.get("thumbnail") or {}
        resolutions = thumb.get("resolutions") or []
        if resolutions:
            thumbnail = resolutions[0].get("url")

        raw_tickers = item.get("relatedTickers") or [base_sym]
        symbols = list({t.split(".")[0].upper() for t in raw_tickers if t})

        items.append(
            NewsItem(
                id=_make_id(link),
                title=title,
                summary="",
                url=link,
                source=source,
                published_at=published_at,
                symbols=symbols,
                thumbnail=thumbnail,
            )
        )

    return items


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("/market", response_model=list[NewsItem])
async def get_market_news(limit: int = 25, user=Depends(get_current_user)):
    """General Indian market news from Economic Times."""
    return await _fetch_rss(ET_MARKETS_RSS, "Economic Times", limit)


@router.get("/results", response_model=list[NewsItem])
async def get_results_news(limit: int = 25, user=Depends(get_current_user)):
    """Financial results and earnings news from Economic Times."""
    return await _fetch_rss(ET_EARNINGS_RSS, "Economic Times", limit)


@router.get("/company", response_model=list[NewsItem])
async def get_company_news(
    symbols: str,
    limit: int = 8,
    user=Depends(get_current_user),
):
    """
    News for specific companies via Yahoo Finance JSON API (no numpy required).

    ?symbols=RELIANCE,TCS,HDFCBANK   (comma-separated NSE symbols, no .NS suffix needed)
    """
    symbol_list = [s.strip().upper() for s in symbols.split(",") if s.strip()]
    if not symbol_list:
        return []

    nested = await asyncio.gather(*[_fetch_yf_news(f"{s}.NS", limit) for s in symbol_list])
    all_items = [item for group in nested for item in group]

    # Deduplicate by title, sort newest first
    seen_titles: set[str] = set()
    unique: list[NewsItem] = []
    for item in sorted(all_items, key=lambda x: x.published_at, reverse=True):
        if item.title not in seen_titles:
            seen_titles.add(item.title)
            unique.append(item)

    return unique
