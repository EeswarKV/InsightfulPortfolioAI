"""
WebSocket endpoint for real-time market price streaming.
Clients connect via wss://<host>/ws/prices?token=<jwt>
"""
import json
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Depends
from pydantic import BaseModel

from app.dependencies import get_current_user, require_manager
from app.services.kite_service import kite_service

logger = logging.getLogger(__name__)

router = APIRouter(tags=["websocket"])


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


@router.get("/auth/kite/callback")
async def kite_callback(request_token: str = ""):
    """
    Zerodha OAuth redirect target.
    Returns the request_token so the user can exchange it for an access_token.
    """
    if not request_token:
        return {"error": "No request_token received"}
    return {
        "request_token": request_token,
        "instructions": (
            "Use this request_token with KiteConnect.generate_session() "
            "to get your access_token, then POST it to /kite/token"
        ),
    }
