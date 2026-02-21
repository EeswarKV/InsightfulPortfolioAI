from datetime import date, datetime
from pydantic import BaseModel


class PortfolioSnapshotCreate(BaseModel):
    portfolio_id: str
    snapshot_date: date
    total_value: float
    invested_value: float
    returns_amount: float
    returns_percent: float
    holdings_count: int
    snapshot_data: dict | None = None


class PortfolioSnapshotResponse(BaseModel):
    id: str
    portfolio_id: str
    snapshot_date: date
    total_value: float
    invested_value: float
    returns_amount: float
    returns_percent: float
    holdings_count: int
    snapshot_data: dict | None = None
    created_at: datetime


class SnapshotMetrics(BaseModel):
    """Performance metrics for a time period"""
    period_start: date
    period_end: date
    value_start: float
    value_end: float
    change_amount: float
    change_percent: float
