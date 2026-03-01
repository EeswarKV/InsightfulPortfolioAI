"""
Expo Push Notification service.

Uses the Expo Push API (https://exp.host/--/api/v2/push/send).
No API key required for Expo push tokens (ExponentPushToken[...]).
"""
import logging

import httpx

from app.services.supabase_client import get_supabase_admin

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


async def send_push(tokens: list[str], title: str, body: str, data: dict | None = None) -> None:
    """Send a push notification to a list of Expo push tokens."""
    if not tokens:
        return

    messages = [
        {
            "to": token,
            "title": title,
            "body": body,
            "data": data or {},
            "sound": "default",
        }
        for token in tokens
    ]

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                EXPO_PUSH_URL,
                json=messages,
                headers={"Content-Type": "application/json", "Accept": "application/json"},
            )
        if resp.status_code != 200:
            logger.warning("[push] Expo API returned %s: %s", resp.status_code, resp.text[:200])
            return
        result = resp.json()
        # Log any delivery errors without raising
        for item in result.get("data", []):
            if item.get("status") == "error":
                logger.warning("[push] Delivery error: %s", item.get("message"))
    except Exception as exc:
        logger.error("[push] Failed to send push notifications: %s", exc)


async def send_to_user(user_id: str, title: str, body: str, data: dict | None = None) -> None:
    """Fetch all push tokens for a user and send them a notification."""
    try:
        supabase = get_supabase_admin()
        result = (
            supabase.table("push_tokens")
            .select("token")
            .eq("user_id", user_id)
            .execute()
        )
        tokens = [row["token"] for row in (result.data or [])]
        await send_push(tokens, title, body, data)
    except Exception as exc:
        logger.error("[push] Error fetching tokens for user %s: %s", user_id, exc)
