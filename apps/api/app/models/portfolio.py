from datetime import datetime, date
from enum import Enum

from pydantic import BaseModel


class AssetType(str, Enum):
    stock = "stock"
    etf = "etf"
    mutual_fund = "mutual_fund"
    bond = "bond"
    crypto = "crypto"


class TransactionType(str, Enum):
    buy = "buy"
    sell = "sell"
    dividend = "dividend"


class HoldingCreate(BaseModel):
    symbol: str
    quantity: float
    avg_cost: float
    asset_type: AssetType
    source: str | None = None
    purchase_date: date | None = None


class HoldingResponse(BaseModel):
    id: str
    portfolio_id: str
    symbol: str
    quantity: float
    avg_cost: float
    asset_type: AssetType
    source: str | None = None
    purchase_date: date


class PortfolioCreate(BaseModel):
    client_id: str
    name: str


class PortfolioResponse(BaseModel):
    id: str
    client_id: str
    name: str
    created_at: datetime
    holdings: list[HoldingResponse] = []


class TransactionCreate(BaseModel):
    symbol: str
    type: TransactionType
    quantity: float
    price: float
    date: date | None = None


class TransactionResponse(BaseModel):
    id: str
    portfolio_id: str
    symbol: str
    type: TransactionType
    quantity: float
    price: float
    date: datetime
