import asyncio
import time
from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.config import settings
from app.dependencies import get_current_user

router = APIRouter()

# Yahoo Finance API (by apidojo) on RapidAPI
YAHOO_FINANCE_API_BASE = "https://yh-finance.p.rapidapi.com"

# ============================================================
# In-memory cache to avoid duplicate API calls
# TTL = 5 minutes — same stock won't hit the API again within 5 min
# ============================================================

_cache: dict[str, tuple[float, dict]] = {}
CACHE_TTL = 300  # 5 minutes


def _cache_get(key: str) -> dict | None:
    entry = _cache.get(key)
    if entry and (time.time() - entry[0]) < CACHE_TTL:
        return entry[1]
    if entry:
        del _cache[key]
    return None


def _cache_set(key: str, data: dict) -> None:
    _cache[key] = (time.time(), data)


# ============================================================
# Pydantic models
# ============================================================


class AnalyzeRequest(BaseModel):
    symbol: str
    fundamentals: dict[str, Any]


# ============================================================
# Helper: call Yahoo Finance API (with cache)
# ============================================================


async def _yahoo_finance_get(endpoint: str, params: dict | None = None) -> dict:
    """Call Yahoo Finance API via RapidAPI with caching."""
    if not settings.indian_api_key:
        raise HTTPException(
            503,
            "Yahoo Finance API not configured. Set INDIAN_API_KEY in .env",
        )

    cache_key = f"{endpoint}:{params}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    headers = {
        "x-rapidapi-host": "yh-finance.p.rapidapi.com",
        "x-rapidapi-key": settings.indian_api_key,
    }

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            f"{YAHOO_FINANCE_API_BASE}{endpoint}",
            params=params,
            headers=headers,
        )
    if resp.status_code == 429:
        raise HTTPException(
            429,
            "Rate limited by stock data provider. Please wait a moment and try again.",
        )
    if resp.status_code != 200:
        raise HTTPException(502, f"Stock data provider error ({resp.status_code}): {resp.text}")

    data = resp.json()
    _cache_set(cache_key, data)
    return data


# ============================================================
# GET /research/search?q=reliance
# ============================================================


@router.get("/search")
async def search_stocks(
    q: str = Query(..., min_length=1),
    region: str = "IN",
    user=Depends(get_current_user),
):
    """Search for stock symbols using Yahoo Finance auto-complete.

    Args:
        q: Search query (company name or symbol)
        region: Market region (IN for India, US for United States, etc.)
    """
    data = await _yahoo_finance_get("/auto-complete", params={"q": q, "region": region})

    quotes = data.get("quotes", [])
    if not quotes:
        return []

    # Format results
    results = []
    for quote in quotes[:10]:  # Limit to 10 results
        if not quote.get("symbol"):
            continue
        results.append({
            "symbol": quote.get("symbol", ""),
            "name": quote.get("longname") or quote.get("shortname", ""),
            "exchange": quote.get("exchDisp", ""),
            "type": quote.get("quoteType", "EQUITY"),
        })

    return results


# ============================================================
# GET /research/fundamentals/{symbol}
# ============================================================


def _fmt_large_inr(val: Any) -> str:
    """Format large INR values in crores."""
    if val is None or val == "N/A":
        return "N/A"
    try:
        v = float(str(val).replace(",", "").replace("₹", ""))
    except (ValueError, TypeError):
        return str(val)
    cr = v / 1e7
    if cr >= 100000:
        return f"₹{cr / 100000:.2f}L Cr"
    if cr >= 1000:
        return f"₹{cr / 1000:.2f}K Cr"
    if cr >= 1:
        return f"₹{cr:,.0f} Cr"
    return f"₹{v:,.0f}"


def _safe_float(val: Any, default: float = 0) -> float:
    if val is None or val == "N/A" or val == "":
        return default
    try:
        return float(str(val).replace(",", "").replace("%", ""))
    except (ValueError, TypeError):
        return default


def _extract_fundamentals(data: dict, symbol: str) -> dict[str, Any]:
    """Transform Yahoo Finance /market/v2/get-quotes response to match frontend schema."""
    # Price and change (directly in the result object)
    price_raw = data.get("regularMarketPrice", 0)
    price_change_pct = data.get("regularMarketChangePercent", 0)
    currency = data.get("currency", "USD")

    # Determine currency symbol
    currency_symbol = "₹" if currency == "INR" else "$" if currency == "USD" else currency

    # Format price
    price_str = f"{currency_symbol}{price_raw:,.2f}" if price_raw else "N/A"

    # Market cap
    market_cap_raw = data.get("marketCap")
    if market_cap_raw:
        market_cap = _fmt_large_inr(market_cap_raw) if currency == "INR" else f"${market_cap_raw / 1e9:.2f}B"
    else:
        market_cap = "N/A"

    # P/E ratios
    pe = _safe_float(data.get("trailingPE"))
    forward_pe = _safe_float(data.get("forwardPE"))

    # EPS
    eps = _safe_float(data.get("epsTrailingTwelveMonths"))

    # Revenue
    revenue_raw = data.get("revenue")
    revenue = _fmt_large_inr(revenue_raw) if revenue_raw and currency == "INR" else f"${revenue_raw / 1e9:.2f}B" if revenue_raw else "N/A"

    # Price to sales as a proxy for margins (since margins not available in this endpoint)
    price_to_sales = _safe_float(data.get("priceToSales"))

    # Dividend Yield
    dividend_yield_raw = data.get("dividendYield")
    dividend_yield = f"{dividend_yield_raw * 100:.2f}%" if dividend_yield_raw else "N/A"

    # Beta
    beta = _safe_float(data.get("beta", 0))

    # 52 week high/low
    year_high_raw = data.get("fiftyTwoWeekHigh")
    year_low_raw = data.get("fiftyTwoWeekLow")
    year_high = f"{currency_symbol}{year_high_raw:,.2f}" if year_high_raw else "N/A"
    year_low = f"{currency_symbol}{year_low_raw:,.2f}" if year_low_raw else "N/A"

    # Company info
    company_name = data.get("longName") or data.get("shortName") or symbol
    exchange = data.get("fullExchangeName", "N/A")

    # Get quoteSummary if available (has more detailed data)
    quote_summary = data.get("quoteSummary", {})
    summary_detail = quote_summary.get("summaryDetail", {})
    earnings_data = quote_summary.get("earnings", {})

    # Extract additional data from summaryDetail if available
    book_value = data.get("bookValue", 0)
    price_to_book = _safe_float(data.get("priceToBook", 0))

    # Quarterly revenue from earnings chart
    quarterly_revenue: list[dict] = []
    financials_chart = earnings_data.get("financialsChart", {})
    quarterly_data = financials_chart.get("quarterly", [])
    if quarterly_data:
        for q in quarterly_data[:4]:
            if isinstance(q, dict):
                quarterly_revenue.append({
                    "q": q.get("date", ""),
                    "value": round(_safe_float(q.get("revenue", 0)) / 1e9, 2),  # Convert to billions
                })

    return {
        "name": company_name,
        "sector": "N/A",  # Not available in this endpoint
        "industry": "N/A",  # Not available in this endpoint
        "marketCap": market_cap,
        "pe": pe,
        "forwardPe": forward_pe,
        "eps": eps,
        "revenue": revenue,
        "revenueGrowth": "N/A",  # Not available in this endpoint
        "grossMargin": "N/A",  # Not available in this endpoint
        "operatingMargin": "N/A",  # Not available in this endpoint
        "netMargin": "N/A",  # Not available in this endpoint
        "roe": "N/A",  # Not available in this endpoint
        "debtToEquity": "N/A",  # Not available in this endpoint
        "currentRatio": "N/A",  # Not available in this endpoint
        "dividendYield": dividend_yield,
        "beta": beta,
        "fiftyTwoHigh": year_high,
        "fiftyTwoLow": year_low,
        "price": price_str,
        "change": f"{'+' if price_change_pct >= 0 else ''}{price_change_pct:.2f}%",
        "description": f"{company_name} is listed on {exchange}.",  # Basic description
        "currency": currency,
        "exchange": exchange,
        "quarterlyRevenue": quarterly_revenue,
    }


@router.get("/fundamentals/{symbol}")
async def get_fundamentals(symbol: str, region: str = "IN", user=Depends(get_current_user)):
    """Get fundamental data for a stock symbol using Yahoo Finance.

    Args:
        symbol: Stock symbol (e.g., RELIANCE.NS for Indian stocks, AAPL for US stocks)
        region: Market region (IN for India, US for United States, etc.)
    """
    # Yahoo Finance expects the full symbol with exchange suffix for Indian stocks
    # e.g., RELIANCE.NS (NSE) or RELIANCE.BO (BSE)
    data = await _yahoo_finance_get(
        "/market/v2/get-quotes",
        params={"symbols": symbol.upper(), "region": region}
    )

    quote_response = data.get("quoteResponse", {})
    results = quote_response.get("result", [])

    if not results or len(results) == 0:
        raise HTTPException(404, f"No data found for {symbol}")

    return _extract_fundamentals(results[0], symbol)


# ============================================================
# POST /research/analyze
# ============================================================


@router.post("/analyze")
async def analyze_stock(body: AnalyzeRequest, user=Depends(get_current_user)):
    if not settings.anthropic_api_key:
        raise HTTPException(
            503,
            "AI analysis not configured. Set ANTHROPIC_API_KEY in .env",
        )

    import anthropic

    f = body.fundamentals
    prompt = f"""You are a financial analyst assistant. Analyze this stock and provide a concise investment analysis.

**{body.symbol}** — {f.get('name', 'Unknown')}
- Sector: {f.get('sector')}
- Price: {f.get('price')} ({f.get('change')})
- Market Cap: {f.get('marketCap')}
- P/E: {f.get('pe')} | Forward P/E: {f.get('forwardPe')}
- EPS: {f.get('eps')}
- Revenue: {f.get('revenue')} (Growth: {f.get('revenueGrowth')})
- Gross Margin: {f.get('grossMargin')} | Operating: {f.get('operatingMargin')} | Net: {f.get('netMargin')}
- ROE: {f.get('roe')} | D/E: {f.get('debtToEquity')} | Current Ratio: {f.get('currentRatio')}
- Beta: {f.get('beta')} | Dividend Yield: {f.get('dividendYield')}
- 52W Range: {f.get('fiftyTwoLow')} - {f.get('fiftyTwoHigh')}

Respond in this exact JSON format (no markdown, just raw JSON):
{{
  "analystRating": "<one of: Strong Buy, Buy, Hold, Sell, Strong Sell>",
  "priceTarget": "<estimated fair value with currency symbol>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "risks": ["<risk 1>", "<risk 2>", "<risk 3>"],
  "keyMetrics": [
    {{"label": "<metric name>", "value": "<value>", "status": "<good|warning|neutral>"}},
    {{"label": "<metric name>", "value": "<value>", "status": "<good|warning|neutral>"}},
    {{"label": "<metric name>", "value": "<value>", "status": "<good|warning|neutral>"}},
    {{"label": "<metric name>", "value": "<value>", "status": "<good|warning|neutral>"}}
  ]
}}

Ensure keyMetrics has exactly 4 items. Use status "good" for healthy metrics, "warning" for concerning ones, and "neutral" for average ones."""

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    message = await asyncio.to_thread(
        lambda: client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
    )

    import json

    try:
        text = message.content[0].text.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        analysis = json.loads(text)
    except (json.JSONDecodeError, IndexError):
        analysis = {
            "analystRating": "Hold",
            "priceTarget": f.get("price", "N/A"),
            "strengths": ["Data available — AI analysis parsing failed"],
            "risks": ["Could not parse AI response"],
            "keyMetrics": [],
        }

    return analysis
