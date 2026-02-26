from datetime import datetime
from enum import Enum

from pydantic import BaseModel, EmailStr


class UserRole(str, Enum):
    manager = "manager"
    client = "client"


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: UserRole
    manager_id: str | None = None


class UserProfileUpdate(BaseModel):
    full_name: str | None = None
    phone_number: str | None = None
    avatar_url: str | None = None


class ClientNotesUpdate(BaseModel):
    notes: str


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: UserRole
    manager_id: str | None = None
    phone_number: str | None = None
    avatar_url: str | None = None
    notes: str | None = None
    created_at: datetime | None = None
