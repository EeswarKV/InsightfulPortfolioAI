import asyncio
from datetime import datetime, timezone

import yfinance as yf
from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_current_user
from app.models.price_alert import PriceAlertCreate, PriceAlertResponse
from app.services.supabase_client import get_supabase_admin

router = APIRouter()


@router.get("/", response_model=list[PriceAlertResponse])
async def get_price_alerts(user=Depends(get_current_user)):
    """Get all price alerts for the current user."""
    supabase = get_supabase_admin()
    result = (
        supabase.table("price_alerts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data


@router.post("/", response_model=PriceAlertResponse)
async def create_price_alert(body: PriceAlertCreate, user=Depends(get_current_user)):
    """Create a new price alert."""
    supabase = get_supabase_admin()
    result = (
        supabase.table("price_alerts")
        .insert(
            {
                "user_id": user.id,
                "symbol": body.symbol.upper(),
                "alert_type": body.alert_type,
                "threshold_price": body.threshold_price,
            }
        )
        .select()
        .single()
        .execute()
    )
    return result.data


@router.delete("/{alert_id}")
async def delete_price_alert(alert_id: str, user=Depends(get_current_user)):
    """Delete a price alert."""
    supabase = get_supabase_admin()
    existing = (
        supabase.table("price_alerts")
        .select("id")
        .eq("id", alert_id)
        .eq("user_id", user.id)
        .single()
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Alert not found")
    supabase.table("price_alerts").delete().eq("id", alert_id).execute()
    return {"status": "deleted"}


def _fetch_price(symbol: str) -> float | None:
    """Synchronous yfinance price fetch — runs in thread pool."""
    try:
        ticker = yf.Ticker(f"{symbol}.NS")
        info = ticker.fast_info
        price = getattr(info, "last_price", None)
        if price:
            return float(price)
        # fallback to history
        hist = ticker.history(period="1d")
        if not hist.empty:
            return float(hist["Close"].iloc[-1])
    except Exception:
        pass
    return None


@router.post("/check")
async def check_price_alerts(user=Depends(get_current_user)):
    """
    Check all active price alerts against current market prices.
    Triggered by the client on app open. Marks triggered alerts as inactive
    and inserts a notification into the alerts table.
    """
    supabase = get_supabase_admin()

    # Fetch active alerts for this user
    result = (
        supabase.table("price_alerts")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", True)
        .execute()
    )
    active_alerts = result.data or []
    if not active_alerts:
        return {"triggered": 0, "checked": 0}

    # Fetch prices for unique symbols (in thread pool — yfinance is sync)
    unique_symbols = list({a["symbol"] for a in active_alerts})
    loop = asyncio.get_event_loop()
    prices: dict[str, float | None] = {}
    for sym in unique_symbols:
        price = await loop.run_in_executor(None, _fetch_price, sym)
        prices[sym] = price

    triggered_count = 0
    now_iso = datetime.now(timezone.utc).isoformat()

    for alert in active_alerts:
        sym = alert["symbol"]
        current_price = prices.get(sym)
        if current_price is None:
            continue

        threshold = float(alert["threshold_price"])
        alert_type = alert["alert_type"]

        condition_met = (
            (alert_type == "above" and current_price >= threshold) or
            (alert_type == "below" and current_price <= threshold)
        )

        if condition_met:
            # Deactivate the alert
            supabase.table("price_alerts").update(
                {"is_active": False, "triggered_at": now_iso}
            ).eq("id", alert["id"]).execute()

            # Insert a notification
            direction = "crossed above" if alert_type == "above" else "dropped below"
            message = (
                f"{sym} has {direction} ₹{threshold:,.2f} "
                f"(current price: ₹{current_price:,.2f})"
            )
            supabase.table("alerts").insert(
                {
                    "user_id": user.id,
                    "type": "price_alert",
                    "message": message,
                }
            ).execute()

            triggered_count += 1

    return {"triggered": triggered_count, "checked": len(active_alerts)}
