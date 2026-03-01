"""
News endpoints — Indian market news, company news, and financial results.

All feeds use Google News RSS (India/English) — free, no API key required.
  /news/market   → query: Indian stock market NSE BSE Sensex Nifty
  /news/company  → query: {SYMBOL} NSE stock India  (one request per symbol)
  /news/results  → query: quarterly results earnings NSE BSE India
"""
import asyncio
import hashlib
import re
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from urllib.parse import quote

import httpx
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.dependencies import get_current_user

router = APIRouter()

GOOGLE_NEWS_BASE = "https://news.google.com/rss/search"
COMMON_HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; PortfolioAI/1.0)"}


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

def _google_url(query: str) -> str:
    return f"{GOOGLE_NEWS_BASE}?q={quote(query)}&hl=en-IN&gl=IN&ceid=IN:en"


def _strip_html(text: str) -> str:
    text = re.sub(r"<[^>]+>", "", text)
    for ent, ch in [
        ("&amp;", "&"), ("&lt;", "<"), ("&gt;", ">"),
        ("&quot;", '"'), ("&#39;", "'"), ("&nbsp;", " "),
    ]:
        text = text.replace(ent, ch)
    return text.strip()


def _make_id(value: str) -> str:
    return hashlib.md5(value.encode()).hexdigest()


def _parse_google_rss(xml_text: str, symbols: list[str]) -> list[NewsItem]:
    """
    Parse a Google News RSS feed.
    Google formats titles as "Article Title - Publisher Name".
    The <source> element also carries the publisher name.
    """
    items: list[NewsItem] = []
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError:
        return items

    channel = root.find("channel") or root
    for item in channel.findall("item"):
        title_raw = (item.findtext("title") or "").strip()
        url = (item.findtext("link") or "").strip()
        guid = (item.findtext("guid") or url).strip()
        pub_raw = (item.findtext("pubDate") or "").strip()

        if not title_raw or not url:
            continue

        # Extract publisher from <source> element, or from the " - Publisher" suffix
        source_el = item.find("source")
        if source_el is not None and source_el.text:
            source = source_el.text.strip()
            title = _strip_html(title_raw)
        elif " - " in title_raw:
            parts = title_raw.rsplit(" - ", 1)
            title = _strip_html(parts[0])
            source = parts[1].strip()
        else:
            title = _strip_html(title_raw)
            source = "Google News"

        try:
            pub_dt = parsedate_to_datetime(pub_raw)
            published_at = pub_dt.astimezone(timezone.utc).isoformat()
        except Exception:
            published_at = datetime.now(timezone.utc).isoformat()

        items.append(
            NewsItem(
                id=_make_id(guid),
                title=title,
                summary="",
                url=url,
                source=source,
                published_at=published_at,
                symbols=symbols,
                thumbnail=None,
            )
        )

    return items


async def _fetch_news(query: str, symbols: list[str], limit: int) -> list[NewsItem]:
    url = _google_url(query)
    try:
        async with httpx.AsyncClient(timeout=10, headers=COMMON_HEADERS, follow_redirects=True) as client:
            resp = await client.get(url)
            if resp.status_code != 200:
                return []
        return _parse_google_rss(resp.text, symbols)[:limit]
    except Exception:
        return []


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("/market", response_model=list[NewsItem])
async def get_market_news(limit: int = 40, user=Depends(get_current_user)):
    """General Indian stock market news — runs multiple queries for broader coverage."""
    queries = [
        "Indian stock market NSE BSE Sensex Nifty",
        "NSE BSE stocks India shares today",
        "Sensex Nifty India gainers losers",
        "India stock market rally crash today",
    ]
    batches = await asyncio.gather(*[_fetch_news(q, [], limit) for q in queries])
    seen: set[str] = set()
    merged: list[NewsItem] = []
    for batch in batches:
        for item in batch:
            if item.title not in seen:
                seen.add(item.title)
                merged.append(item)
    merged.sort(key=lambda x: x.published_at, reverse=True)
    return merged[:limit]


@router.get("/results", response_model=list[NewsItem])
async def get_results_news(limit: int = 40, user=Depends(get_current_user)):
    """Financial results and earnings news — runs multiple queries for broader coverage."""
    queries = [
        "quarterly results earnings NSE BSE India",
        "India company results profit revenue quarterly",
        "BSE NSE earnings dividend announcement India",
    ]
    batches = await asyncio.gather(*[_fetch_news(q, [], limit) for q in queries])
    seen: set[str] = set()
    merged: list[NewsItem] = []
    for batch in batches:
        for item in batch:
            if item.title not in seen:
                seen.add(item.title)
                merged.append(item)
    merged.sort(key=lambda x: x.published_at, reverse=True)
    return merged[:limit]


@router.get("/company", response_model=list[NewsItem])
async def get_company_news(
    symbols: str,
    limit: int = 8,
    user=Depends(get_current_user),
):
    """
    News for specific Indian companies via Google News RSS.
    ?symbols=RELIANCE,TCS,HDFCBANK  (comma-separated NSE symbols)
    """
    symbol_list = [s.strip().upper() for s in symbols.split(",") if s.strip()]
    if not symbol_list:
        return []

    async def fetch_one(sym: str) -> list[NewsItem]:
        return await _fetch_news(f"{sym} NSE India stock", [sym], limit)

    nested = await asyncio.gather(*[fetch_one(s) for s in symbol_list])
    all_items = [item for group in nested for item in group]

    # Deduplicate by title, newest first
    seen: set[str] = set()
    unique: list[NewsItem] = []
    for item in sorted(all_items, key=lambda x: x.published_at, reverse=True):
        if item.title not in seen:
            seen.add(item.title)
            unique.append(item)

    return unique
