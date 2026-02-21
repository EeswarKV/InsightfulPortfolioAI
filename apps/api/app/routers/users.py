from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_current_user, require_manager
from app.models.user import UserResponse, UserProfileUpdate
from app.services.supabase_client import get_supabase_admin

router = APIRouter()


@router.get("/me", response_model=UserResponse)
async def get_my_profile(user=Depends(get_current_user)):
    """Get the current user's profile."""
    supabase = get_supabase_admin()
    result = (
        supabase.table("users")
        .select("*")
        .eq("id", user.id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Profile not found")
    return result.data


@router.patch("/me", response_model=UserResponse)
async def update_my_profile(
    updates: UserProfileUpdate,
    user=Depends(get_current_user),
):
    """Update the current user's profile."""
    supabase = get_supabase_admin()
    payload = {k: v for k, v in updates.model_dump().items() if v is not None}
    if not payload:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = (
        supabase.table("users")
        .update(payload)
        .eq("id", user.id)
        .select()
        .single()
        .execute()
    )
    return result.data


@router.get("/clients", response_model=list[UserResponse])
async def get_clients(manager=Depends(require_manager)):
    """Get all clients managed by the current manager."""
    supabase = get_supabase_admin()
    result = (
        supabase.table("users")
        .select("*")
        .eq("manager_id", manager.id)
        .execute()
    )
    return result.data


@router.post("/clients", response_model=UserResponse)
async def create_client(
    email: str,
    full_name: str,
    password: str,
    manager=Depends(require_manager),
):
    """Manager creates a new client account."""
    supabase = get_supabase_admin()

    # Create auth user
    try:
        auth_result = supabase.auth.admin.create_user(
            {
                "email": email,
                "password": password,
                "user_metadata": {"full_name": full_name, "role": "client"},
                "email_confirm": True,
            }
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Set the manager_id on the public.users row
    supabase.table("users").update({"manager_id": manager.id}).eq(
        "id", auth_result.user.id
    ).execute()

    result = (
        supabase.table("users")
        .select("*")
        .eq("id", auth_result.user.id)
        .single()
        .execute()
    )
    return result.data


@router.delete("/clients/{client_id}")
async def unlink_client(client_id: str, manager=Depends(require_manager)):
    """Manager unlinks a client (sets manager_id to null)."""
    supabase = get_supabase_admin()

    # Verify client belongs to this manager
    client = (
        supabase.table("users")
        .select("*")
        .eq("id", client_id)
        .eq("manager_id", manager.id)
        .single()
        .execute()
    )
    if not client.data:
        raise HTTPException(status_code=404, detail="Client not found or not assigned to you")

    # Unlink by setting manager_id to null
    supabase.table("users").update({"manager_id": None}).eq("id", client_id).execute()

    return {"success": True, "message": "Client unlinked successfully"}
