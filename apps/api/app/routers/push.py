"""
Push notification token management endpoints.

POST /push/register-token   — upsert an Expo push token for the current user
DELETE /push/unregister-token — remove a token (e.g. on logout)
POST /push/test             — send a test push to the current user's registered tokens
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.dependencies import get_current_user
from app.services.push_service import send_to_user
from app.services.supabase_client import get_supabase_admin

router = APIRouter()


class TokenPayload(BaseModel):
    token: str
    platform: str  # 'ios' | 'android'


@router.post("/register-token")
async def register_token(payload: TokenPayload, user=Depends(get_current_user)):
    """Upsert a push token for the current user."""
    if not payload.token.startswith("ExponentPushToken["):
        raise HTTPException(status_code=400, detail="Invalid Expo push token format")

    supabase = get_supabase_admin()
    supabase.table("push_tokens").upsert(
        {
            "user_id": user.id,
            "token": payload.token,
            "platform": payload.platform,
            "updated_at": "now()",
        },
        on_conflict="user_id,token",
    ).execute()
    return {"status": "ok"}


@router.delete("/unregister-token")
async def unregister_token(payload: TokenPayload, user=Depends(get_current_user)):
    """Remove a push token (call on logout or token rotation)."""
    supabase = get_supabase_admin()
    supabase.table("push_tokens").delete().eq("user_id", user.id).eq(
        "token", payload.token
    ).execute()
    return {"status": "ok"}


@router.post("/test")
async def test_push(user=Depends(get_current_user)):
    """Send a test push notification to all of the current user's registered tokens."""
    supabase = get_supabase_admin()
    result = supabase.table("push_tokens").select("token").eq("user_id", user.id).execute()
    tokens = [row["token"] for row in (result.data or [])]
    if not tokens:
        raise HTTPException(status_code=404, detail="No push tokens registered for this user")
    await send_to_user(user.id, "Test Notification 🎉", "Push notifications are working!")
    return {"status": "sent", "token_count": len(tokens)}
