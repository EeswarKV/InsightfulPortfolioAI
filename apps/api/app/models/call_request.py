from datetime import datetime

from pydantic import BaseModel


class CallRequestCreate(BaseModel):
    preferred_datetime: str
    contact_method: str  # "phone" or "email"
    contact_value: str
    notes: str | None = None


class CallRequestResponse(BaseModel):
    id: str
    client_id: str
    manager_id: str
    preferred_datetime: str
    contact_method: str
    contact_value: str
    status: str
    notes: str | None
    created_at: datetime
