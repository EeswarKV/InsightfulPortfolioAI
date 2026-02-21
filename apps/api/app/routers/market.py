from fastapi import APIRouter, Depends, HTTPException
import httpx

from app.config import settings
from app.dependencies import get_current_user

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
