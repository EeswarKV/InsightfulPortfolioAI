import asyncio
import time
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException
import httpx

from app.config import settings
from app.dependencies import get_current_user

# ── Simple in-process cache ────────────────────────────────────────────────────
_cache: dict[str, tuple[float, object]] = {}

def _get(key: str, ttl: int):
    if key in _cache:
        ts, data = _cache[key]
        if time.time() - ts < ttl:
            return data
    return None

def _set(key: str, data: object):
    _cache[key] = (time.time(), data)

# ── Global market instruments ──────────────────────────────────────────────────
GLOBAL_SYMBOLS = "^GSPC,^IXIC,^NSEI,^BSESN,^N225,000001.SS,^FTSE,^GDAXI,GC=F,SI=F,BTC-USD,ETH-USD"
SYMBOL_NAMES = {
    "^GSPC":      "S&P 500",
    "^IXIC":      "NASDAQ",
    "^NSEI":      "Nifty 50",
    "^BSESN":     "Sensex",
    "^N225":      "Nikkei 225",
    "000001.SS":  "Shanghai",
    "^FTSE":      "FTSE 100",
    "^GDAXI":     "DAX",
    "GC=F":       "Gold",
    "SI=F":       "Silver",
    "BTC-USD":    "Bitcoin",
    "ETH-USD":    "Ethereum",
}
YF_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "application/json",
}

router = APIRouter()

# Yahoo Finance API (by apidojo) on RapidAPI
YAHOO_FINANCE_API_BASE = "https://yh-finance.p.rapidapi.com"


@router.get("/quote/{symbol}")
async def get_quote(symbol: str, region: str = "US", user=Depends(get_current_user)):
    """Get a stock quote by symbol. Uses Yahoo Finance API (apidojo) via RapidAPI.

    Args:
        symbol: Stock symbol (e.g., AAPL, RELIANCE.NS for Indian stocks)
        region: Market region - US, IN, etc. (default: US)
    """
    if not settings.indian_api_key:
        # Fallback: return mock data if no API key configured
        return {
            "symbol": symbol.upper(),
            "open": 0,
            "high": 0,
            "low": 0,
            "close": 0,
            "volume": 0,
            "error": "Yahoo Finance API not configured. Set INDIAN_API_KEY in .env",
        }

    headers = {
        "x-rapidapi-host": "yh-finance.p.rapidapi.com",
        "x-rapidapi-key": settings.indian_api_key,
    }

    async with httpx.AsyncClient() as client:
        try:
            # Use market/v2/get-quotes endpoint for stock data
            response = await client.get(
                f"{YAHOO_FINANCE_API_BASE}/market/v2/get-quotes",
                params={"symbols": symbol.upper(), "region": region},
                headers=headers,
                timeout=10.0,
            )

            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Market data unavailable: {response.text}"
                )

            data = response.json()
            quote_response = data.get("quoteResponse", {})
            results = quote_response.get("result", [])

            if not results or len(results) == 0:
                raise HTTPException(status_code=404, detail=f"No quote found for {symbol}")

            # Parse Yahoo Finance response structure
            quote = results[0]

            return {
                "symbol": symbol.upper(),
                "open": quote.get("regularMarketOpen", 0),
                "high": quote.get("regularMarketDayHigh", 0),
                "low": quote.get("regularMarketDayLow", 0),
                "close": quote.get("regularMarketPrice", 0),
                "volume": quote.get("regularMarketVolume", 0),
                "previousClose": quote.get("regularMarketPreviousClose", 0),
                "marketCap": quote.get("marketCap", 0),
                "currency": quote.get("currency", "USD"),
            }
        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail="Market data request timed out")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Market data error: {str(e)}")


@router.get("/search")
async def search_symbols(q: str, region: str = "US", user=Depends(get_current_user)):
    """Search for stock symbols. Uses Yahoo Finance auto-complete API.

    Args:
        q: Search query (company name or symbol)
        region: Market region - US, IN, etc. (default: US)
    """
    if not settings.indian_api_key:
        # Fallback: return empty results if no API key configured
        return []

    headers = {
        "x-rapidapi-host": "yh-finance.p.rapidapi.com",
        "x-rapidapi-key": settings.indian_api_key,
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{YAHOO_FINANCE_API_BASE}/auto-complete",
                params={"q": q, "region": region},
                headers=headers,
                timeout=10.0,
            )

            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail="Search unavailable"
                )

            data = response.json()
            quotes = data.get("quotes", [])

            # Format results
            results = [
                {
                    "symbol": quote.get("symbol", ""),
                    "name": quote.get("longname") or quote.get("shortname", ""),
                    "market": quote.get("exchDisp", ""),
                    "type": quote.get("quoteType", "stock"),
                    "exchange": quote.get("exchange", ""),
                }
                for quote in quotes
                if quote.get("symbol")  # Only include results with symbols
            ]

            return results[:10]  # Limit to 10 results
        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail="Search request timed out")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Search error: {str(e)}")


# ── Global market quotes (ticker) ──────────────────────────────────────────────

async def _fetch_one_quote(client: httpx.AsyncClient, symbol: str) -> dict | None:
    """Fetch a single symbol via the v8 chart API (no crumb/cookie needed)."""
    try:
        url = f"https://query2.finance.yahoo.com/v8/finance/chart/{symbol}"
        resp = await client.get(url, params={"interval": "1d", "range": "1d"})
        if resp.status_code != 200:
            return None
        meta = resp.json()["chart"]["result"][0]["meta"]
        price = float(meta.get("regularMarketPrice") or 0)
        prev = float(meta.get("previousClose") or meta.get("chartPreviousClose") or 0)
        change = float(meta.get("regularMarketChange") or (price - prev if prev else 0))
        change_pct = float(
            meta.get("regularMarketChangePercent")
            or ((change / prev * 100) if prev else 0)
        )
        return {
            "symbol": symbol,
            "name": SYMBOL_NAMES.get(symbol, meta.get("shortName", symbol)),
            "price": round(price, 4),
            "change": round(change, 4),
            "changePercent": round(change_pct, 4),
            "currency": meta.get("currency", "USD"),
        }
    except Exception:
        return None


@router.get("/global-quotes")
async def get_global_quotes(user=Depends(get_current_user)):
    """
    Current prices for major global indices, commodities, and crypto.
    Uses parallel v8 chart requests (no crumb needed). Cached 60 seconds.
    """
    cached = _get("global_quotes", ttl=60)
    if cached is not None:
        return cached

    symbols = GLOBAL_SYMBOLS.split(",")
    try:
        async with httpx.AsyncClient(headers=YF_HEADERS, timeout=15, follow_redirects=True) as client:
            results = await asyncio.gather(*[_fetch_one_quote(client, sym) for sym in symbols])
    except Exception:
        return []

    output = [r for r in results if r is not None]
    if output:
        _set("global_quotes", output)
    return output


# ── Index historical closes (comparison chart) ─────────────────────────────────

@router.get("/index-history")
async def get_index_history(symbol: str, days: int = 30, user=Depends(get_current_user)):
    """
    Daily closing prices for any Yahoo Finance symbol over the last N days.
    Used for portfolio vs index comparison chart. Cached for 1 hour.
    """
    cache_key = f"hist_{symbol}_{days}"
    cached = _get(cache_key, ttl=3600)
    if cached is not None:
        return cached

    now = datetime.now(timezone.utc)
    period2 = int(now.timestamp())
    period1 = int((now - timedelta(days=days + 5)).timestamp())  # +5 to account for weekends

    url = f"https://query2.finance.yahoo.com/v8/finance/chart/{symbol}"
    params = {"period1": period1, "period2": period2, "interval": "1d"}

    try:
        async with httpx.AsyncClient(headers=YF_HEADERS, timeout=10, follow_redirects=True) as client:
            resp = await client.get(url, params=params)
            if resp.status_code != 200:
                return []
            data = resp.json()
    except Exception:
        return []

    try:
        result = data["chart"]["result"][0]
        timestamps = result.get("timestamp", [])
        closes = (
            result.get("indicators", {}).get("adjclose", [{}])[0].get("adjclose")
            or result.get("indicators", {}).get("quote", [{}])[0].get("close", [])
        )
    except (KeyError, IndexError, TypeError):
        return []

    output = []
    for ts, close in zip(timestamps, closes):
        if close is None:
            continue
        date_str = datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%Y-%m-%d")
        output.append({"date": date_str, "close": round(float(close), 2)})

    # Keep only last N days
    output = output[-days:]
    _set(cache_key, output)
    return output
