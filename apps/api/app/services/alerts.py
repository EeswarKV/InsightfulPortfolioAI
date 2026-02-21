from app.services.supabase_client import get_supabase_admin


def create_alert(user_id: str, alert_type: str, message: str) -> dict:
    """Create an alert/notification for a user."""
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
    return result.data[0] if result.data else {}
