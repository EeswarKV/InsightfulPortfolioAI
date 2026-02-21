from fastapi import APIRouter, Depends

from app.dependencies import get_current_user
from app.models.alert import AlertResponse
from app.services.supabase_client import get_supabase_admin

router = APIRouter()


@router.get("/", response_model=list[AlertResponse])
async def get_alerts(user=Depends(get_current_user)):
    """Get all alerts for the current user."""
    supabase = get_supabase_admin()
    result = (
        supabase.table("alerts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data


@router.get("/unread-count")
async def get_unread_count(user=Depends(get_current_user)):
    """Get the count of unread alerts for the current user."""
    supabase = get_supabase_admin()
    result = (
        supabase.table("alerts")
        .select("id", count="exact")
        .eq("user_id", user.id)
        .eq("read", False)
        .execute()
    )
    return {"count": result.count or 0}


@router.patch("/{alert_id}/read")
async def mark_alert_read(alert_id: str, user=Depends(get_current_user)):
    """Mark an alert as read."""
    supabase = get_supabase_admin()
    supabase.table("alerts").update({"read": True}).eq("id", alert_id).eq(
        "user_id", user.id
    ).execute()
    return {"status": "ok"}
