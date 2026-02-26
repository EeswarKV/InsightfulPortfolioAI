from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class PriceAlertCreate(BaseModel):
    symbol: str
    alert_type: Literal["above", "below"]
    threshold_price: float


class PriceAlertResponse(BaseModel):
    id: str
    user_id: str
    symbol: str
    alert_type: str
    threshold_price: float
    is_active: bool
    triggered_at: datetime | None = None
    created_at: datetime
