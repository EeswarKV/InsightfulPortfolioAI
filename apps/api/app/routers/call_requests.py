from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_current_user
from app.models.call_request import CallRequestCreate, CallRequestResponse
from app.services.alerts import create_alert
from app.services.supabase_client import get_supabase_admin

router = APIRouter()


@router.post("/", response_model=CallRequestResponse)
async def create_call_request(body: CallRequestCreate, user=Depends(get_current_user)):
    """Client requests a call with their fund manager."""
    metadata = user.user_metadata or {}
    if metadata.get("role") != "client":
        raise HTTPException(403, "Only clients can request calls")

    supabase = get_supabase_admin()

    # Get client's manager
    client_row = (
        supabase.table("users")
        .select("manager_id, full_name")
        .eq("id", user.id)
        .single()
        .execute()
    )
    if not client_row.data or not client_row.data.get("manager_id"):
        raise HTTPException(400, "No manager assigned to your account")

    manager_id = client_row.data["manager_id"]
    client_name = client_row.data.get("full_name") or user.email

    result = (
        supabase.table("call_requests")
        .insert({
            "client_id": user.id,
            "manager_id": manager_id,
            "preferred_datetime": body.preferred_datetime,
            "contact_method": body.contact_method,
            "contact_value": body.contact_value,
            "notes": body.notes,
        })
        .execute()
    )

    # Notify both parties
    create_alert(
        user.id,
        "call_scheduled",
        f"Your call request has been submitted for {body.preferred_datetime}. "
        f"Your fund manager will confirm shortly.",
    )
    create_alert(
        manager_id,
        "call_request",
        f"Client {client_name} has requested a call. "
        f"Preferred time: {body.preferred_datetime}. "
        f"Contact: {body.contact_method} — {body.contact_value}",
    )

    return result.data[0]


@router.get("/", response_model=list[CallRequestResponse])
async def get_call_requests(user=Depends(get_current_user)):
    """Get call requests for the current user (role-aware)."""
    supabase = get_supabase_admin()
    metadata = user.user_metadata or {}
    role = metadata.get("role", "client")

    if role == "manager":
        result = (
            supabase.table("call_requests")
            .select("*")
            .eq("manager_id", user.id)
            .order("created_at", desc=True)
            .execute()
        )
    else:
        result = (
            supabase.table("call_requests")
            .select("*")
            .eq("client_id", user.id)
            .order("created_at", desc=True)
            .execute()
        )

    return result.data
