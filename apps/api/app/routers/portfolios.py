from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_current_user, require_manager
from app.models.portfolio import (
    HoldingCreate,
    HoldingResponse,
    PortfolioCreate,
    PortfolioResponse,
    TransactionCreate,
    TransactionResponse,
)
from app.services.supabase_client import get_supabase_admin

router = APIRouter()


@router.get("/", response_model=list[PortfolioResponse])
async def get_portfolios(user=Depends(get_current_user)):
    """Get portfolios visible to the current user."""
    supabase = get_supabase_admin()
    metadata = user.user_metadata or {}
    role = metadata.get("role", "client")

    if role == "manager":
        # Get all clients' portfolios
        clients = (
            supabase.table("users")
            .select("id")
            .eq("manager_id", user.id)
            .execute()
        )
        client_ids = [c["id"] for c in clients.data]
        if not client_ids:
            return []
        result = (
            supabase.table("portfolios")
            .select("*")
            .in_("client_id", client_ids)
            .execute()
        )
    else:
        result = (
            supabase.table("portfolios")
            .select("*")
            .eq("client_id", user.id)
            .execute()
        )

    return result.data


@router.post("/", response_model=PortfolioResponse)
async def create_portfolio(portfolio: PortfolioCreate, manager=Depends(require_manager)):
    """Manager creates a portfolio for a client."""
    supabase = get_supabase_admin()

    # Verify client belongs to this manager
    client = (
        supabase.table("users")
        .select("*")
        .eq("id", portfolio.client_id)
        .eq("manager_id", manager.id)
        .single()
        .execute()
    )
    if not client.data:
        raise HTTPException(status_code=404, detail="Client not found")

    result = (
        supabase.table("portfolios")
        .insert({"client_id": portfolio.client_id, "name": portfolio.name})
        .execute()
    )
    return result.data[0]


@router.get("/{portfolio_id}/holdings", response_model=list[HoldingResponse])
async def get_holdings(portfolio_id: str, user=Depends(get_current_user)):
    """Get holdings for a specific portfolio."""
    supabase = get_supabase_admin()
    result = (
        supabase.table("holdings")
        .select("*")
        .eq("portfolio_id", portfolio_id)
        .execute()
    )
    return result.data


@router.post("/{portfolio_id}/holdings", response_model=HoldingResponse)
async def add_holding(
    portfolio_id: str,
    holding: HoldingCreate,
    manager=Depends(require_manager),
):
    """Manager adds a holding to a portfolio."""
    supabase = get_supabase_admin()
    result = (
        supabase.table("holdings")
        .insert(
            {
                "portfolio_id": portfolio_id,
                "symbol": holding.symbol,
                "quantity": holding.quantity,
                "avg_cost": holding.avg_cost,
                "asset_type": holding.asset_type.value,
                "source": holding.source,
            }
        )
        .execute()
    )

    # Notify the client about the portfolio change
    portfolio = (
        supabase.table("portfolios")
        .select("client_id")
        .eq("id", portfolio_id)
        .single()
        .execute()
    )
    if portfolio.data:
        from app.services.alerts import create_alert

        create_alert(
            portfolio.data["client_id"],
            "portfolio_update",
            f"Your fund manager added {holding.symbol} "
            f"({holding.quantity} units @ Rs.{holding.avg_cost}) to your portfolio.",
        )

    return result.data[0]


@router.patch("/{portfolio_id}/holdings/{holding_id}/price")
async def update_manual_price(
    portfolio_id: str,
    holding_id: str,
    manual_price: float,
    user=Depends(get_current_user),
):
    """
    Update manual price/NAV for a holding (for mutual funds, bonds, etc.).
    Returns the updated holding.
    """
    from datetime import datetime, timezone

    supabase = get_supabase_admin()
    user_id = user.id

    # Verify user has access to this portfolio
    portfolio_check = (
        supabase.table("portfolios")
        .select("id, client_id")
        .eq("id", portfolio_id)
        .single()
        .execute()
    )

    if not portfolio_check.data:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    client_id = portfolio_check.data["client_id"]
    metadata = user.user_metadata or {}
    user_role = metadata.get("role", "client")

    # Check if user is client or their manager
    if user_role == "client" and client_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    elif user_role == "manager":
        # Verify manager owns this client
        client_check = (
            supabase.table("users")
            .select("manager_id")
            .eq("id", client_id)
            .single()
            .execute()
        )
        if not client_check.data or client_check.data.get("manager_id") != user_id:
            raise HTTPException(status_code=403, detail="Access denied")

    # Update the holding
    result = (
        supabase.table("holdings")
        .update({
            "manual_price": manual_price,
            "last_price_update": datetime.now(timezone.utc).isoformat(),
        })
        .eq("id", holding_id)
        .eq("portfolio_id", portfolio_id)
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Holding not found")

    return result.data[0]


@router.delete("/{portfolio_id}/holdings/{holding_id}", status_code=204)
async def delete_holding(
    portfolio_id: str,
    holding_id: str,
    manager=Depends(require_manager),
):
    """Manager removes a holding from a client's portfolio."""
    supabase = get_supabase_admin()

    # Verify the portfolio belongs to a client of this manager
    portfolio = (
        supabase.table("portfolios")
        .select("client_id")
        .eq("id", portfolio_id)
        .single()
        .execute()
    )
    if not portfolio.data:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    client_check = (
        supabase.table("users")
        .select("manager_id")
        .eq("id", portfolio.data["client_id"])
        .single()
        .execute()
    )
    if not client_check.data or client_check.data.get("manager_id") != manager.id:
        raise HTTPException(status_code=403, detail="Access denied")

    result = (
        supabase.table("holdings")
        .delete()
        .eq("id", holding_id)
        .eq("portfolio_id", portfolio_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Holding not found")


@router.get("/{portfolio_id}/transactions", response_model=list[TransactionResponse])
async def get_transactions(portfolio_id: str, user=Depends(get_current_user)):
    """Get transactions for a specific portfolio."""
    supabase = get_supabase_admin()
    result = (
        supabase.table("transactions")
        .select("*")
        .eq("portfolio_id", portfolio_id)
        .order("date", desc=True)
        .execute()
    )
    return result.data


@router.post("/{portfolio_id}/transactions", response_model=TransactionResponse)
async def add_transaction(
    portfolio_id: str,
    transaction: TransactionCreate,
    manager=Depends(require_manager),
):
    """Manager adds a transaction to a portfolio."""
    supabase = get_supabase_admin()
    result = (
        supabase.table("transactions")
        .insert(
            {
                "portfolio_id": portfolio_id,
                "symbol": transaction.symbol,
                "type": transaction.type.value,
                "quantity": transaction.quantity,
                "price": transaction.price,
            }
        )
        .execute()
    )

    # Notify the client about the transaction
    portfolio = (
        supabase.table("portfolios")
        .select("client_id")
        .eq("id", portfolio_id)
        .single()
        .execute()
    )
    if portfolio.data:
        from app.services.alerts import create_alert

        action = {
            "buy": "bought",
            "sell": "sold",
            "dividend": "recorded a dividend for",
        }.get(transaction.type.value, "recorded")
        create_alert(
            portfolio.data["client_id"],
            "transaction",
            f"Your fund manager {action} {transaction.quantity} units of "
            f"{transaction.symbol} at Rs.{transaction.price}.",
        )

    return result.data[0]
