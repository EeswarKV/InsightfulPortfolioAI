from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr

from app.dependencies import get_current_user
from app.services.supabase_client import get_supabase_client

router = APIRouter()


class SignUpRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    user_id: str
    email: str
    role: str


@router.post("/signup", response_model=AuthResponse)
async def signup(req: SignUpRequest):
    supabase = get_supabase_client()
    try:
        result = supabase.auth.sign_up(
            {
                "email": req.email,
                "password": req.password,
                "options": {
                    "data": {
                        "full_name": req.full_name,
                        "role": req.role,
                    }
                },
            }
        )
        session = result.session
        user = result.user
        if session is None:
            # Email confirmation may be required
            return AuthResponse(
                access_token="",
                refresh_token="",
                user_id=user.id,
                email=user.email,
                role=req.role,
            )
        return AuthResponse(
            access_token=session.access_token,
            refresh_token=session.refresh_token,
            user_id=user.id,
            email=user.email,
            role=req.role,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login", response_model=AuthResponse)
async def login(req: LoginRequest):
    supabase = get_supabase_client()
    try:
        result = supabase.auth.sign_in_with_password(
            {
                "email": req.email,
                "password": req.password,
            }
        )
        session = result.session
        user = result.user
        role = (user.user_metadata or {}).get("role", "client")
        return AuthResponse(
            access_token=session.access_token,
            refresh_token=session.refresh_token,
            user_id=user.id,
            email=user.email,
            role=role,
        )
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid credentials")


@router.get("/me")
async def get_me(user=Depends(get_current_user)):
    metadata = user.user_metadata or {}
    return {
        "id": user.id,
        "email": user.email,
        "full_name": metadata.get("full_name"),
        "role": metadata.get("role"),
    }
