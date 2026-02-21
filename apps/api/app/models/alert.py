from datetime import datetime

from pydantic import BaseModel


class AlertCreate(BaseModel):
    user_id: str
    type: str
    message: str


class AlertResponse(BaseModel):
    id: str
    user_id: str
    type: str
    message: str
    read: bool
    created_at: datetime
