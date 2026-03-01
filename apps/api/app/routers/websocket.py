"""
WebSocket endpoint for real-time market price streaming.
Clients connect via wss://<host>/ws/prices?token=<jwt>
"""
import hashlib
import json
import logging
import time

import httpx
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Depends
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

from app.dependencies import get_current_user, require_manager
from app.services.kite_service import kite_service

logger = logging.getLogger(__name__)

router = APIRouter(tags=["websocket"])

# ── Simple in-process cache for Kite quotes (30-second TTL) ──────────────────
_kite_quote_cache: dict[str, tuple[float, object]] = {}

def _kite_cache_get(key: str, ttl: int):
    if key in _kite_quote_cache:
        ts, data = _kite_quote_cache[key]
        if time.time() - ts < ttl:
            return data
    return None

def _kite_cache_set(key: str, data: object):
    _kite_quote_cache[key] = (time.time(), data)


# ─── WebSocket Endpoint ───────────────────────────────────────────────────────

@router.websocket("/ws/prices")
async def prices_ws(websocket: WebSocket, token: str = ""):
    """
    Real-time price streaming WebSocket.

    Query param:  ?token=<supabase_jwt>
    First message: {"action": "subscribe", "symbols": ["NSE:RELIANCE", "NSE:TCS"]}
    Subsequent:    {"action": "subscribe"|"unsubscribe", "symbols": [...]}
    """
    # ── Validate JWT before accepting ────────────────────────────────────────
    if not token:
        await websocket.close(code=4001, reason="Missing auth token")
        return

    try:
        from app.services.supabase_client import get_supabase_admin
        supabase = get_supabase_admin()
        result = supabase.auth.get_user(token)
        if not result or not result.user:
            await websocket.close(code=4001, reason="Invalid token")
            return
    except Exception as exc:
        logger.warning("WebSocket auth failed: %s", exc)
        await websocket.close(code=4001, reason="Auth error")
        return

    # ── Accept and register ───────────────────────────────────────────────────
    await websocket.accept()
    await kite_service.manager.connect(websocket)
    logger.info("WebSocket client connected")

    # Send current connection status immediately
    connected = kite_service._connected
    source = kite_service._source
    await websocket.send_text(
        json.dumps({"type": "status", "connected": connected, "source": source})
    )

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue

            action = msg.get("action")
            symbols: list[str] = msg.get("symbols", [])

            if not symbols:
                continue

            if action == "subscribe":
                await kite_service.manager.subscribe(websocket, symbols)
                await kite_service.subscribe_symbols(symbols)
                logger.debug("Client subscribed to: %s", symbols)

            elif action == "unsubscribe":
                await kite_service.manager.unsubscribe(websocket, symbols)
                logger.debug("Client unsubscribed from: %s", symbols)

    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    except Exception as exc:
        logger.error("WebSocket error: %s", exc)
    finally:
        await kite_service.manager.disconnect(websocket)


# ─── Token Management REST Endpoints ─────────────────────────────────────────

class TokenRefreshRequest(BaseModel):
    access_token: str


@router.get("/kite/status")
async def kite_status(manager=Depends(require_manager)):
    """Get current Kite connection status."""
    return {
        "connected": kite_service._connected,
        "source": kite_service._source,
        "subscribed_symbols": len(kite_service.manager.all_subscribed_symbols()),
        "instruments_loaded": kite_service.instruments._loaded,
    }


@router.post("/kite/token")
async def refresh_kite_token(
    body: TokenRefreshRequest,
    manager=Depends(require_manager),
):
    """
    Hot-swap Kite access token without redeploying.
    Call this daily after generating a new access_token.
    """
    await kite_service.refresh_token(body.access_token)
    return {"message": "Kite token refreshed successfully"}


@router.get("/kite/quotes")
async def get_kite_quotes(
    symbols: str,
    user=Depends(get_current_user),
):
    """
    Get last traded prices from Kite REST API for a comma-separated list of symbols.
    Works 24/7 — returns last close price when market is closed.
    Results are cached for 30 seconds to avoid rate limiting.

    Example: GET /kite/quotes?symbols=NSE:RELIANCE,NSE:TCS
    Returns:  {"NSE:RELIANCE": {"ltp": 2485.5, "close": 2473.2}, ...}
    """
    if not kite_service._access_token or not kite_service._api_key:
        raise HTTPException(status_code=503, detail="Kite not configured")

    symbol_list = [s.strip() for s in symbols.split(",") if s.strip()]
    if not symbol_list:
        return {}

    # Strip Yahoo Finance exchange suffixes (.NS, .BO) that don't belong in Kite symbols.
    # e.g. "NSE:RELIANCE.NS" → "NSE:RELIANCE"
    def _clean(sym: str) -> str:
        if ":" in sym:
            exchange, ticker = sym.split(":", 1)
            if ticker.upper().endswith((".NS", ".BO")):
                ticker = ticker.rsplit(".", 1)[0]
            return f"{exchange}:{ticker}"
        return sym

    clean_list = sorted([_clean(s) for s in symbol_list])  # sort for consistent cache key

    # Check cache — 30-second TTL (frequent enough for near-real-time, low enough to avoid Kite rate limits)
    cache_key = ",".join(clean_list)
    cached = _kite_cache_get(cache_key, ttl=30)
    if cached is not None:
        return cached

    params = [("i", s) for s in clean_list]
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                "https://api.kite.trade/quote",
                params=params,
                headers={
                    "Authorization": f"token {kite_service._api_key}:{kite_service._access_token}",
                    "X-Kite-Version": "3",
                },
            )
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Kite API request timed out")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Kite API error: {str(e)}")

    if resp.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"Kite quote API error: {resp.status_code}",
        )

    data = resp.json().get("data", {})
    result = {
        sym: {
            "ltp": quote.get("last_price", 0),
            "close": quote.get("ohlc", {}).get("close", 0),
        }
        for sym, quote in data.items()
    }
    _kite_cache_set(cache_key, result)
    return result


@router.get("/kite/ohlc/{symbol}")
async def get_kite_ohlc(
    symbol: str,
    interval: str = "day",
    from_date: str = "",
    to_date: str = "",
    user=Depends(get_current_user),
):
    """
    Get historical OHLCV candles from Kite for a given NSE symbol.

    - symbol: NSE ticker without exchange prefix (e.g. "RELIANCE")
    - interval: "day" | "week" | "month" | "5minute" etc.
    - from_date / to_date: YYYY-MM-DD

    Returns: [{date, open, high, low, close, volume}, ...]
    Cache: 5 minutes
    """
    if not kite_service._access_token or not kite_service._api_key:
        raise HTTPException(status_code=503, detail="Kite not configured")

    kite_symbol = f"NSE:{symbol.upper()}"
    token = kite_service.instruments.token(kite_symbol)
    if token is None:
        raise HTTPException(status_code=404, detail=f"Symbol {symbol} not found in Kite instruments")

    cache_key = f"ohlc:{token}:{interval}:{from_date}:{to_date}"
    cached = _kite_cache_get(cache_key, ttl=300)
    if cached is not None:
        return cached

    params = {
        "from": f"{from_date} 09:00:00",
        "to": f"{to_date} 15:30:00",
        "continuous": 0,
        "oi": 0,
    }

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"https://api.kite.trade/instruments/historical/{token}/{interval}",
                params=params,
                headers={
                    "Authorization": f"token {kite_service._api_key}:{kite_service._access_token}",
                    "X-Kite-Version": "3",
                },
            )
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Kite API request timed out")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Kite API error: {str(e)}")

    if resp.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"Kite historical API error {resp.status_code}: {resp.text[:200]}",
        )

    candles = resp.json().get("data", {}).get("candles", [])
    result = [
        {
            "date": c[0][:10],
            "open": c[1],
            "high": c[2],
            "low": c[3],
            "close": c[4],
            "volume": c[5],
        }
        for c in candles
        if len(c) >= 6
    ]

    _kite_cache_set(cache_key, result)
    return result


@router.get("/auth/kite/login")
async def kite_login():
    """
    Redirects the browser to Zerodha's OAuth login page.
    After login, Zerodha calls back to /auth/kite/callback automatically.
    """
    from app.config import settings as _s
    from fastapi.responses import RedirectResponse
    if not _s.kite_api_key:
        return HTMLResponse("<h2>Error: KITE_API_KEY not configured in Railway</h2>", status_code=500)
    login_url = f"https://kite.trade/connect/login?api_key={_s.kite_api_key}&v=3"
    return RedirectResponse(login_url)


@router.get("/auth/kite/callback")
async def kite_callback(request_token: str = ""):
    """
    Zerodha OAuth redirect target. Automatically exchanges the request_token
    for an access_token, refreshes the live Kite service, and shows the token
    so it can be copied into Railway environment variables.
    """
    from app.config import settings as _s
    if not request_token:
        return HTMLResponse("<h2>Error: no request_token in URL</h2>", status_code=400)

    api_key = _s.kite_api_key
    api_secret = _s.kite_api_secret
    if not api_key or not api_secret:
        return HTMLResponse("<h2>Error: KITE_API_KEY / KITE_API_SECRET not configured</h2>", status_code=500)

    # Checksum = SHA256(api_key + request_token + api_secret)
    checksum = hashlib.sha256(f"{api_key}{request_token}{api_secret}".encode()).hexdigest()

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                "https://api.kite.trade/session/token",
                data={"api_key": api_key, "request_token": request_token, "checksum": checksum},
                headers={"X-Kite-Version": "3"},
            )
        if resp.status_code != 200:
            return HTMLResponse(f"<h2>Kite error {resp.status_code}</h2><pre>{resp.text}</pre>", status_code=502)
        access_token = resp.json()["data"]["access_token"]
    except Exception as e:
        return HTMLResponse(f"<h2>Exchange failed</h2><pre>{e}</pre>", status_code=500)

    # Hot-swap token in the live service (no restart needed)
    await kite_service.refresh_token(access_token)
    logger.info("Kite access token refreshed via OAuth callback")

    return HTMLResponse(f"""
    <html><body style="font-family:monospace;padding:24px;background:#0f172a;color:#e2e8f0">
    <h2 style="color:#22c55e">✓ Kite token refreshed successfully</h2>
    <p>Copy the token below and update <b>KITE_ACCESS_TOKEN</b> in your Railway environment variables
    so it survives the next redeploy:</p>
    <textarea rows="3" style="width:100%;padding:8px;background:#1e293b;color:#86efac;border:1px solid #334155;border-radius:6px"
              onclick="this.select()">{access_token}</textarea>
    <p style="color:#94a3b8;font-size:12px">The running service is already using the new token.</p>
    </body></html>
    """)
