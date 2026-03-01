"""
News endpoints — Indian market news, company news, and financial results.

Sources (all public RSS feeds from Indian financial publishers):
  Market:    Economic Times, LiveMint, Business Standard, MoneyControl
  Results:   ET Earnings, BS Results, MC Earnings
  Company:   ET company search RSS + symbol matching from market feeds
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

COMMON_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/rss+xml, application/xml, text/xml, */*",
    "Accept-Language": "en-IN,en;q=0.9",
}

# ── Feed catalogue ──────────────────────────────────────────────────────────────

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


# ── Helpers ────────────────────────────────────────────────────────────────────

def _strip_html(text: str) -> str:
    text = re.sub(r"<[^>]+>", "", text)
    for ent, ch in [
        ("&amp;", "&"), ("&lt;", "<"), ("&gt;", ">"),
        ("&quot;", '"'), ("&#39;", "'"), ("&nbsp;", " "),
        ("&#8211;", "–"), ("&#8217;", "'"), ("&#8216;", "'"),
    ]:
        text = text.replace(ent, ch)
    return text.strip()


def _make_id(value: str) -> str:
    return hashlib.md5(value.encode()).hexdigest()


def _parse_rss(xml_text: str, symbols: list[str]) -> list["NewsItem"]:
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
        desc_raw = (item.findtext("description") or "").strip()

        if not title_raw or not url:
            continue

        # Extract publisher from <source> element or " - Publisher" suffix
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
            source = ""

        # Fallback: infer source from URL domain
        if not source:
            if "economictimes" in url:
                source = "Economic Times"
            elif "moneycontrol" in url:
                source = "MoneyControl"
            elif "livemint" in url:
                source = "LiveMint"
            elif "business-standard" in url:
                source = "Business Standard"
            elif "financialexpress" in url:
                source = "Financial Express"
            else:
                source = "Market News"

        summary = _strip_html(desc_raw)[:200] if desc_raw else ""

        try:
            pub_dt = parsedate_to_datetime(pub_raw)
            published_at = pub_dt.astimezone(timezone.utc).isoformat()
        except Exception:
            published_at = datetime.now(timezone.utc).isoformat()

        items.append(
            NewsItem(
                id=_make_id(guid),
                title=title,
                summary=summary,
                url=url,
                source=source,
                published_at=published_at,
                symbols=symbols,
                thumbnail=None,
            )
        )

    return items


async def _fetch_feed(url: str, symbols: list[str]) -> list["NewsItem"]:
    try:
        async with httpx.AsyncClient(timeout=12, headers=COMMON_HEADERS, follow_redirects=True) as client:
            resp = await client.get(url)
            if resp.status_code != 200:
                return []
        return _parse_rss(resp.text, symbols)
    except Exception:
        return []


def _merge_dedupe(batches: list[list["NewsItem"]], limit: int) -> list["NewsItem"]:
    seen: set[str] = set()
    merged: list[NewsItem] = []
    for batch in batches:
        for item in batch:
            key = item.title.lower()[:60]
            if key not in seen:
                seen.add(key)
                merged.append(item)
    merged.sort(key=lambda x: x.published_at, reverse=True)
    return merged[:limit]


# ── Models ──────────────────────────────────────────────────────────────────────

class NewsItem(BaseModel):
    id: str
    title: str
    summary: str
    url: str
    source: str
    published_at: str
    symbols: list[str]
    thumbnail: str | None


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("/market", response_model=list[NewsItem])
async def get_market_news(limit: int = 40, user=Depends(get_current_user)):
    """General Indian market news from publisher RSS feeds."""
    batches = await asyncio.gather(*[_fetch_feed(url, []) for url in MARKET_FEEDS])
    return _merge_dedupe(list(batches), limit)


@router.get("/results", response_model=list[NewsItem])
async def get_results_news(limit: int = 40, user=Depends(get_current_user)):
    """Earnings and financial results news from publisher RSS feeds."""
    batches = await asyncio.gather(*[_fetch_feed(url, []) for url in RESULTS_FEEDS])
    return _merge_dedupe(list(batches), limit)


@router.get("/company", response_model=list[NewsItem])
async def get_company_news(
    symbols: str,
    limit: int = 10,
    user=Depends(get_current_user),
):
    """
    News for specific Indian companies — fetches all market feeds then filters
    by symbol mention in title. Falls back to Google News for each symbol.
    ?symbols=RELIANCE,TCS,HDFCBANK
    """
    symbol_list = [s.strip().upper() for s in symbols.split(",") if s.strip()]
    if not symbol_list:
        return []

    # Fetch all market feeds + results feeds in parallel
    all_feeds = MARKET_FEEDS + RESULTS_FEEDS
    batches = await asyncio.gather(*[_fetch_feed(url, []) for url in all_feeds])

    # Tag each article with matching symbols
    tagged: list[NewsItem] = []
    for batch in batches:
        for item in batch:
            matching = [s for s in symbol_list if s.lower() in item.title.lower()]
            if matching:
                tagged.append(item.model_copy(update={"symbols": matching}))

    # If very few results, supplement with Google News per symbol
    if len(tagged) < 5:
        google_base = "https://news.google.com/rss/search"
        async def _gnews(sym: str) -> list[NewsItem]:
            url = f"{google_base}?q={quote(sym+' NSE India stock')}&hl=en-IN&gl=IN&ceid=IN:en"
            items = await _fetch_feed(url, [sym])
            return items
        g_batches = await asyncio.gather(*[_gnews(s) for s in symbol_list[:5]])
        for batch in g_batches:
            tagged.extend(batch)

    return _merge_dedupe([tagged], limit)
