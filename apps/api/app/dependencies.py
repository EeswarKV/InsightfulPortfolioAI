from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import httpx

from app.config import settings
from app.services.supabase_client import get_supabase_admin

security = HTTPBearer()

# Export Supabase admin client for routers that need direct database access
supabase = get_supabase_admin()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """Verify JWT by calling Supabase GoTrue API directly."""
    token = credentials.credentials
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{settings.supabase_url}/auth/v1/user",
                headers={
                    "Authorization": f"Bearer {token}",
                    "apikey": settings.supabase_service_key,
                },
            )
        if resp.status_code != 200:
            print(f"[Auth] Supabase returned {resp.status_code}: {resp.text}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
            )
        user_data = resp.json()

        # Return a simple namespace so .id, .user_metadata etc. work
        class User:
            def __init__(self, data: dict):
                self.id = data.get("id")
                self.email = data.get("email")
                self.user_metadata = data.get("user_metadata", {})
                self.role = data.get("role")
                self.raw = data

        return User(user_data)
    except httpx.HTTPError as e:
        print(f"[Auth] HTTP error verifying token: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Failed to verify token",
        )


async def require_manager(user=Depends(get_current_user)):
    """Ensure the authenticated user has the 'manager' role."""
    metadata = user.user_metadata or {}
    if metadata.get("role") != "manager":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Manager access required",
        )
    return user
