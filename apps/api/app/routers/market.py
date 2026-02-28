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

# ha Finance API (by apidojo) on RapidAPI
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

    # Check cache first (5-minute TTL to avoid rate limiting Yahoo Finance)
    cache_key = f"quote_{symbol.upper()}_{region}"
    cached = _get(cache_key, ttl=300)
    if cached is not None:
        return cached

    headers = {
        "x-rapidapi-host": "yh-finance.p.rapidapi.com",
        "x-rapidapi-key": settings.indian_api_key,
    }

    try:
        async with httpx.AsyncClient() as client:
            # Use market/v2/get-quotes endpoint for stock data
            response = await client.get(
                f"{YAHOO_FINANCE_API_BASE}/market/v2/get-quotes",
                params={"symbols": symbol.upper(), "region": region},
                headers=headers,
                timeout=10.0,
            )
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Market data request timed out")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Market data error: {str(e)}")

    if response.status_code != 200:
        raise HTTPException(
            status_code=response.status_code,
            detail=f"Market data unavailable: {response.text}"
        )

    try:
        data = response.json()
        quote_response = data.get("quoteResponse", {})
        results = quote_response.get("result", [])

        if not results or len(results) == 0:
            raise HTTPException(status_code=404, detail=f"No quote found for {symbol}")

        # Parse Yahoo Finance response structure
        quote = results[0]

        result = {
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
        _set(cache_key, result)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Market data parse error: {str(e)}")


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


# ── Market Movers — parallel v8 chart requests (same API as global-quotes) ─────
# Yahoo Finance screener endpoints require crumb/auth that breaks from cloud servers.
# The v8 chart API works without any auth — already proven by /market/global-quotes.
# We fetch a broad watchlist of NSE stocks in parallel and sort them.

import re as _re

# Nifty 50 + Nifty Next 50 + popular Midcap 100 (~200 stocks)
_NSE_WATCHLIST = [s + ".NS" for s in [
    # ── Nifty 50 ──
    "RELIANCE", "TCS", "HDFCBANK", "BHARTIARTL", "ICICIBANK",
    "INFY", "SBIN", "ITC", "HINDUNILVR", "LT",
    "KOTAKBANK", "AXISBANK", "BAJFINANCE", "ASIANPAINT", "MARUTI",
    "HCLTECH", "SUNPHARMA", "M&M", "WIPRO", "ULTRACEMCO",
    "NTPC", "POWERGRID", "NESTLEIND", "BAJAJFINSV", "TITAN",
    "TECHM", "INDUSINDBK", "ADANIENT", "ONGC", "JSWSTEEL",
    "COALINDIA", "ADANIPORTS", "TATASTEEL", "GRASIM", "BPCL",
    "BRITANNIA", "EICHERMOT", "DRREDDY", "CIPLA", "DIVISLAB",
    "APOLLOHOSP", "HEROMOTOCO", "SHRIRAMFIN", "BAJAJ-AUTO", "HINDALCO",
    "TATACONSUM", "SBILIFE", "HDFCLIFE", "TATAMOTORS", "BEL",
    # ── Nifty Next 50 ──
    "ADANIGREEN", "AMBUJACEM", "ATGL", "AUBANK", "BALKRISIND",
    "BANKBARODA", "BERGEPAINT", "BOSCHLTD", "CANBK", "CHOLAFIN",
    "COLPAL", "DABUR", "DLF", "DMART", "GAIL",
    "GODREJCP", "GODREJPROP", "HAVELLS", "ICICIGI", "ICICIPRULI",
    "IDFCFIRSTB", "INDIGO", "IOC", "IRCTC", "JSWENERGY",
    "LUPIN", "MARICO", "MFSL", "MOTHERSON", "MUTHOOTFIN",
    "NAUKRI", "NHPC", "NMDC", "OBEROIRLTY", "PAGEIND",
    "PIDILITIND", "PIIND", "POLYCAB", "RECLTD", "SBICARD",
    "SIEMENS", "SRF", "TATAELXSI", "TRENT", "TORNTPHARM",
    "TORNTPOWER", "VEDL", "VOLTAS", "ZOMATO", "ZYDUSLIFE",
    # ── Nifty Midcap 100 / popular ──
    "ABB", "APLAPOLLO", "ASTRAL", "AUROPHARMA", "BATAINDIA",
    "BHEL", "BIOCON", "CESC", "CGPOWER", "COFORGE",
    "CROMPTON", "CUMMINSIND", "DALBHARAT", "DEEPAKNTR", "DIXON",
    "ESCORTS", "FEDERALBNK", "FORTIS", "GLAXO", "HAL",
    "HINDPETRO", "INDUSTOWER", "IRFC", "JINDALSTEL", "JUBLFOOD",
    "KALYANKJIL", "KPITTECH", "LALPATHLAB", "LTTS", "MAXHEALTH",
    "MCX", "MINDA", "MRF", "NYKAA", "OIL",
    "PETRONET", "PFC", "POLICYBZR", "RVNL", "SAIL",
    "SJVN", "SUPREMEIND", "TATACOMM", "TATAPOWER", "TATATECH",
    "TRIDENT", "UBL", "UNIONBANK", "PAYTM", "ABCAPITAL",
    # ── Sector leaders & additional popular ──
    "ALKEM", "ATUL", "BAJAJHFL", "BANKINDIA", "CANFINHOME",
    "CONCOR", "CRISIL", "FLUOROCHEM", "GMRINFRA", "GRINDWELL",
    "GSPL", "HAPPSTMNDS", "HPCL", "HUDCO", "IDBI",
    "INDIANB", "IOB", "JKCEMENT", "JSWINFRA", "KALPATPOWR",
    "LAURUSLABS", "LTIM", "MAHABANK", "METROPOLIS", "MRPL",
    "NAVINFLUOR", "NLCINDIA", "PGHH", "PNBHOUSING", "RBLBANK",
    "REDINGTON", "SANOFI", "STAR", "SUNDARMFIN", "TATAINVEST",
    "THYROCARE", "TIINDIA", "TTKPRESTIG", "ZENSARTECH", "WELSPUNLIV",
]]


async def _fetch_movers_kite() -> list[dict]:
    """Fetch all watchlist quotes in one Kite Connect REST API call.

    Returns an empty list if Kite credentials are not configured or the
    request fails (caller will fall back to Yahoo Finance).
    """
    api_key = settings.kite_api_key
    access_token = settings.kite_access_token
    if not api_key or not access_token:
        return []

    # Convert watchlist from Yahoo format (RELIANCE.NS) → Kite format (NSE:RELIANCE)
    kite_symbols = [f"NSE:{s.replace('.NS', '')}" for s in _NSE_WATCHLIST]

    headers = {
        "X-Kite-Version": "3",
        "Authorization": f"token {api_key}:{access_token}",
    }
    # Kite accepts up to 500 instruments as repeated ?i= params
    params = [("i", sym) for sym in kite_symbols]

    try:
        async with httpx.AsyncClient(headers=headers, timeout=20) as client:
            resp = await client.get("https://api.kite.trade/quote", params=params)
        if resp.status_code != 200:
            return []
        data = resp.json().get("data", {})
    except Exception:
        return []

    quotes: list[dict] = []
    for sym, quote in data.items():
        ltp = float(quote.get("last_price") or 0)
        if ltp <= 0:
            continue
        prev_close = float(quote.get("ohlc", {}).get("close") or ltp)
        change = round(ltp - prev_close, 2)
        change_pct = round((change / prev_close * 100) if prev_close else 0, 2)
        volume = int(quote.get("volume") or 0)
        ohlc = quote.get("ohlc", {})
        display = sym.split(":")[1] if ":" in sym else sym
        quotes.append({
            "symbol": display,
            "ltp": round(ltp, 2),
            "change": change,
            "changePercent": change_pct,
            "volume": volume,
            "prevClose": round(prev_close, 2),
            "high": round(float(ohlc.get("high") or 0), 2),
            "low": round(float(ohlc.get("low") or 0), 2),
        })
    return quotes


async def _fetch_movers_yf() -> list[dict]:
    """Fallback: parallel Yahoo Finance v8 chart requests — no auth needed."""
    async with httpx.AsyncClient(headers=YF_HEADERS, timeout=15, follow_redirects=True) as client:
        async def _one(symbol: str) -> dict | None:
            try:
                resp = await client.get(
                    f"https://query2.finance.yahoo.com/v8/finance/chart/{symbol}",
                    params={"interval": "1d", "range": "1d"},
                )
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
                volume = int(meta.get("regularMarketVolume") or 0)
                display = _re.sub(r"\.(NS|BO)$", "", symbol, flags=_re.IGNORECASE)
                return {
                    "symbol": display,
                    "ltp": round(price, 2),
                    "change": round(change, 2),
                    "changePercent": round(change_pct, 2),
                    "volume": volume,
                    "prevClose": round(prev, 2),
                    "high": round(float(meta.get("regularMarketDayHigh") or 0), 2),
                    "low": round(float(meta.get("regularMarketDayLow") or 0), 2),
                }
            except Exception:
                return None

        raw = await asyncio.gather(*[_one(sym) for sym in _NSE_WATCHLIST])
    return [q for q in raw if q is not None and q["ltp"] > 0]


@router.get("/movers")
async def get_market_movers(
    category: str = "gainers",
    _user=Depends(get_current_user),
):
    """Top 20 NSE market movers.

    Uses Kite Connect REST API (single request) when credentials are available;
    falls back to parallel Yahoo Finance v8 chart requests otherwise.

    Args:
        category: gainers | losers | trending  (default: gainers)
    """
    if category not in ("gainers", "losers", "trending"):
        raise HTTPException(400, "category must be gainers, losers, or trending")

    cache_key = f"movers_{category}"
    cached = _get(cache_key, ttl=300)  # 5-minute cache
    if cached is not None:
        return cached

    # Prefer Kite Connect (1 request, accurate, no geo-block)
    quotes = await _fetch_movers_kite()
    # Fall back to parallel Yahoo Finance if Kite not configured / token expired
    if not quotes:
        quotes = await _fetch_movers_yf()

    if category == "gainers":
        result = sorted(
            [q for q in quotes if q["changePercent"] > 0],
            key=lambda x: x["changePercent"], reverse=True,
        )[:20]
    elif category == "losers":
        result = sorted(
            [q for q in quotes if q["changePercent"] < 0],
            key=lambda x: x["changePercent"],
        )[:20]
    else:  # trending
        result = sorted(quotes, key=lambda x: x["volume"], reverse=True)[:20]

    if result:
        _set(cache_key, result)
    return result
