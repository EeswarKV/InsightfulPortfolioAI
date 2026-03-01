import asyncio
import logging

from app.services.supabase_client import get_supabase_admin

logger = logging.getLogger(__name__)

_ALERT_TITLES: dict[str, str] = {
    "price_alert": "Price Alert 🔔",
    "portfolio_update": "Portfolio Update 📊",
    "news": "Market News 📰",
    "report": "Report Ready 📄",
}


def create_alert(user_id: str, alert_type: str, message: str) -> dict:
    """Create an alert/notification for a user and fire a push notification."""
    supabase = get_supabase_admin()
    result = (
        supabase.table("alerts")
        .insert({
            "user_id": user_id,
            "type": alert_type,
            "message": message,
        })
        .execute()
    )
    alert = result.data[0] if result.data else {}

    # Fire push notification asynchronously (best-effort)
    title = _ALERT_TITLES.get(alert_type, "PortfolioAI")
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # We're inside an async context — schedule without blocking
            loop.create_task(_send_push_for_alert(user_id, title, message))
        else:
            loop.run_until_complete(_send_push_for_alert(user_id, title, message))
    except Exception as exc:
        logger.warning("[alerts] Could not schedule push for user %s: %s", user_id, exc)

    return alert


async def _send_push_for_alert(user_id: str, title: str, body: str) -> None:
    from app.services.push_service import send_to_user
    await send_to_user(user_id, title, body)
