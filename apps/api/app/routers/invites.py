"""
Client Invite System API

Allows fund managers to invite clients via email.
Clients can accept invites and automatically get linked to their manager.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta, timezone
from typing import Optional
import secrets

from app.dependencies import get_current_user, require_manager, supabase
from app.services.email_service import send_invite_email

router = APIRouter(prefix="/invites", tags=["invites"])


# ============================================
# Models
# ============================================

class InviteCreate(BaseModel):
    """Request body for creating a client invite"""
    email: EmailStr
    full_name: str
    phone: Optional[str] = None


class InviteResponse(BaseModel):
    """Invite information"""
    id: str
    manager_id: str
    client_email: str
    client_name: str
    client_phone: Optional[str]
    invite_token: str
    expires_at: str
    status: str
    created_at: str
    invite_url: str  # Frontend URL for client to accept


class InviteAccept(BaseModel):
    """Request body for accepting an invite"""
    password: str


# ============================================
# Helper Functions
# ============================================

def generate_invite_token() -> str:
    """Generate a secure random invite token"""
    # Generate 32 random bytes, convert to URL-safe base64
    token = secrets.token_urlsafe(32)
    return token


def get_invite_url(token: str) -> str:
    """Generate the frontend URL for accepting an invite"""
    # TODO: Replace with actual frontend URL
    frontend_url = "https://portfolioai.app"  # Production URL
    # frontend_url = "http://localhost:8081"  # Dev URL
    return f"{frontend_url}/invite/{token}"


# ============================================
# Endpoints
# ============================================

@router.post("", response_model=InviteResponse, status_code=status.HTTP_201_CREATED)
async def create_invite(
    invite_data: InviteCreate,
    current_user=Depends(require_manager)
):
    """
    Create a client invite (Manager only)

    - Manager sends invite to client email
    - Creates pending user account
    - Returns invite token for tracking
    """
    manager_id = current_user.id

    # Check if user with this email already exists
    existing_user = supabase.table("users").select("*").eq("email", invite_data.email).execute()
    if existing_user.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists"
        )

    # Check if there's already a pending invite for this email from this manager
    existing_invite = supabase.table("invites")\
        .select("*")\
        .eq("manager_id", manager_id)\
        .eq("client_email", invite_data.email)\
        .eq("status", "pending")\
        .execute()

    if existing_invite.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You've already sent an invite to this email"
        )

    # Generate invite token
    invite_token = generate_invite_token()
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)  # 7 day expiration

    # Create invite record
    invite = supabase.table("invites").insert({
        "manager_id": manager_id,
        "client_email": invite_data.email,
        "client_name": invite_data.full_name,
        "client_phone": invite_data.phone,
        "invite_token": invite_token,
        "expires_at": expires_at.isoformat(),
        "status": "pending"
    }).execute()

    if not invite.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create invite"
        )

    invite_record = invite.data[0]

    # Send invite email (non-blocking — failure just logs a warning)
    manager_name = (current_user.user_metadata or {}).get("full_name", "Your portfolio manager")
    invite_url = get_invite_url(invite_token)
    send_invite_email(invite_data.email, invite_data.full_name, manager_name, invite_url)

    return {
        **invite_record,
        "invite_url": get_invite_url(invite_token)
    }


@router.get("", response_model=list[InviteResponse])
async def list_invites(
    status_filter: Optional[str] = None,
    current_user=Depends(require_manager)
):
    """
    List all invites created by the current manager

    - Query param: status (pending, accepted, expired, cancelled)
    """
    manager_id = current_user.id

    query = supabase.table("invites")\
        .select("*")\
        .eq("manager_id", manager_id)\
        .order("created_at", desc=True)

    if status_filter:
        query = query.eq("status", status_filter)

    result = query.execute()

    return [
        {**invite, "invite_url": get_invite_url(invite["invite_token"])}
        for invite in result.data
    ]


@router.get("/{token}")
async def get_invite_by_token(token: str):
    """
    Get invite details by token (Public endpoint for invite acceptance page)

    - No authentication required
    - Used by client to view invite before accepting
    """
    # Clean up expired invites first
    supabase.rpc("cleanup_expired_invites").execute()

    # Get invite by token
    result = supabase.table("invites")\
        .select("*, manager:manager_id(full_name, email)")\
        .eq("invite_token", token)\
        .execute()

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invite not found"
        )

    invite = result.data[0]

    # Check if expired
    if invite["status"] == "expired" or datetime.fromisoformat(invite["expires_at"]) < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This invite has expired"
        )

    # Check if already accepted
    if invite["status"] == "accepted":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This invite has already been accepted"
        )

    return invite


@router.post("/{token}/accept")
async def accept_invite(token: str, accept_data: InviteAccept):
    """
    Accept an invite and create client account

    - Creates user account with provided password
    - Links client to manager
    - Creates initial portfolio
    - Marks invite as accepted
    """
    # Get invite
    invite_result = supabase.table("invites")\
        .select("*")\
        .eq("invite_token", token)\
        .execute()

    if not invite_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invite not found"
        )

    invite = invite_result.data[0]

    # Validate invite
    if invite["status"] != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This invite is no longer valid"
        )

    if datetime.fromisoformat(invite["expires_at"]) < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This invite has expired"
        )

    # Create Supabase auth user
    try:
        auth_response = supabase.auth.admin.create_user({
            "email": invite["client_email"],
            "password": accept_data.password,
            "email_confirm": True,
            "user_metadata": {
                "full_name": invite["client_name"],
                "role": "client"
            }
        })

        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user account"
            )

        user_id = auth_response.user.id

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create account: {str(e)}"
        )

    # Create user record in public.users table
    try:
        user_record = supabase.table("users").insert({
            "id": user_id,
            "email": invite["client_email"],
            "full_name": invite["client_name"],
            "phone_number": invite.get("client_phone"),
            "role": "client",
            "manager_id": invite["manager_id"],
            "status": "active",
            "invited_by": invite["manager_id"]
        }).execute()

        if not user_record.data:
            # Rollback auth user if user record creation fails
            supabase.auth.admin.delete_user(user_id)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user record"
            )

    except Exception as e:
        # Rollback auth user
        supabase.auth.admin.delete_user(user_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create user: {str(e)}"
        )

    # Create initial portfolio for client
    try:
        portfolio = supabase.table("portfolios").insert({
            "client_id": user_id,
            "name": "Main Portfolio"
        }).execute()

    except Exception as e:
        print(f"Warning: Failed to create initial portfolio: {e}")

    # Mark invite as accepted
    supabase.table("invites")\
        .update({
            "status": "accepted",
            "accepted_at": datetime.now(timezone.utc).isoformat()
        })\
        .eq("id", invite["id"])\
        .execute()

    return {
        "message": "Invite accepted successfully",
        "user_id": user_id,
        "email": invite["client_email"]
    }


@router.delete("/{invite_id}")
async def cancel_invite(
    invite_id: str,
    current_user=Depends(require_manager)
):
    """
    Cancel a pending invite (Manager only)
    """
    manager_id = current_user.id

    # Verify invite belongs to this manager
    invite = supabase.table("invites")\
        .select("*")\
        .eq("id", invite_id)\
        .eq("manager_id", manager_id)\
        .execute()

    if not invite.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invite not found"
        )

    # Update invite status
    result = supabase.table("invites")\
        .update({"status": "cancelled"})\
        .eq("id", invite_id)\
        .execute()

    return {"message": "Invite cancelled successfully"}
