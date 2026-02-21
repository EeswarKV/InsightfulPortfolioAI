from datetime import date, datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException

from ..dependencies import get_current_user
from ..services.supabase_client import get_supabase_admin
from ..models.snapshot import (
    PortfolioSnapshotCreate,
    PortfolioSnapshotResponse,
    SnapshotMetrics,
)

router = APIRouter(prefix="/portfolios", tags=["snapshots"])


@router.post("/{portfolio_id}/snapshots", response_model=PortfolioSnapshotResponse)
async def create_snapshot(
    portfolio_id: str,
    snapshot: PortfolioSnapshotCreate,
    user=Depends(get_current_user),
):
    """
    Create a portfolio snapshot.
    Note: Typically called by a scheduled job, but can be manually triggered.
    """
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

    # Check if user is client or manager
    client_id = portfolio_check.data["client_id"]
    client_check = (
        supabase.table("users")
        .select("id, manager_id")
        .eq("id", client_id)
        .single()
        .execute()
    )

    if not client_check.data:
        raise HTTPException(status_code=403, detail="Access denied")

    if client_id != user_id and client_check.data.get("manager_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Insert snapshot (upsert to handle same-day updates)
    result = (
        supabase.table("portfolio_snapshots")
        .upsert(
            {
                "portfolio_id": snapshot.portfolio_id,
                "snapshot_date": snapshot.snapshot_date.isoformat(),
                "total_value": snapshot.total_value,
                "invested_value": snapshot.invested_value,
                "returns_amount": snapshot.returns_amount,
                "returns_percent": snapshot.returns_percent,
                "holdings_count": snapshot.holdings_count,
                "snapshot_data": snapshot.snapshot_data,
            },
            on_conflict="portfolio_id,snapshot_date",
        )
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create snapshot")

    return result.data[0]


@router.get("/{portfolio_id}/snapshots", response_model=list[PortfolioSnapshotResponse])
async def get_snapshots(
    portfolio_id: str,
    start_date: date | None = None,
    end_date: date | None = None,
    limit: int = 365,
    user=Depends(get_current_user),
):
    """
    Get portfolio snapshots for a date range.
    """
    supabase = get_supabase_admin()
    user_id = user.id

    # Verify access
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
    client_check = (
        supabase.table("users")
        .select("id, manager_id")
        .eq("id", client_id)
        .single()
        .execute()
    )

    if not client_check.data:
        raise HTTPException(status_code=403, detail="Access denied")

    if client_id != user_id and client_check.data.get("manager_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Query snapshots
    query = (
        supabase.table("portfolio_snapshots")
        .select("*")
        .eq("portfolio_id", portfolio_id)
        .order("snapshot_date", desc=True)
        .limit(limit)
    )

    if start_date:
        query = query.gte("snapshot_date", start_date.isoformat())
    if end_date:
        query = query.lte("snapshot_date", end_date.isoformat())

    result = query.execute()
    return result.data


@router.get("/{portfolio_id}/performance", response_model=list[SnapshotMetrics])
async def get_performance_metrics(
    portfolio_id: str,
    period: str = "monthly",  # daily, monthly, yearly
    user=Depends(get_current_user),
):
    """
    Get performance metrics for a portfolio based on historical snapshots.
    Returns period-over-period performance data for charts.
    """
    supabase = get_supabase_admin()
    user_id = user.id

    # Verify access (same as above)
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
    client_check = (
        supabase.table("users")
        .select("id, manager_id")
        .eq("id", client_id)
        .single()
        .execute()
    )

    if not client_check.data:
        raise HTTPException(status_code=403, detail="Access denied")

    if client_id != user_id and client_check.data.get("manager_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Determine date range based on period
    today = date.today()
    if period == "daily":
        start_date = today - timedelta(days=7)
        periods = 7
    elif period == "monthly":
        start_date = today - timedelta(days=180)  # ~6 months
        periods = 6
    else:  # yearly
        start_date = today - timedelta(days=1825)  # ~5 years
        periods = 5

    # Get all snapshots in date range
    snapshots_result = (
        supabase.table("portfolio_snapshots")
        .select("snapshot_date, total_value")
        .eq("portfolio_id", portfolio_id)
        .gte("snapshot_date", start_date.isoformat())
        .order("snapshot_date", desc=False)
        .execute()
    )

    snapshots = snapshots_result.data
    if not snapshots:
        return []

    # Group by period and calculate changes
    metrics = []

    if period == "daily":
        # Last 7 days
        for i in range(6, -1, -1):
            day = today - timedelta(days=i)
            day_snapshots = [s for s in snapshots if s["snapshot_date"] == day.isoformat()]

            if day_snapshots:
                # Find previous day's snapshot
                prev_day = day - timedelta(days=1)
                prev_snapshots = [
                    s for s in snapshots if s["snapshot_date"] == prev_day.isoformat()
                ]

                if prev_snapshots:
                    value_start = prev_snapshots[0]["total_value"]
                    value_end = day_snapshots[0]["total_value"]
                    change_amount = value_end - value_start
                    change_percent = (
                        (change_amount / value_start * 100) if value_start > 0 else 0
                    )

                    metrics.append(
                        SnapshotMetrics(
                            period_start=prev_day,
                            period_end=day,
                            value_start=value_start,
                            value_end=value_end,
                            change_amount=change_amount,
                            change_percent=change_percent,
                        )
                    )

    elif period == "monthly":
        # Last 6 months
        for i in range(5, -1, -1):
            month_start = date(
                today.year if today.month - i > 0 else today.year - 1,
                (today.month - i) if today.month - i > 0 else (12 + (today.month - i)),
                1,
            )
            # Get last day of month
            if month_start.month == 12:
                month_end = date(month_start.year + 1, 1, 1) - timedelta(days=1)
            else:
                month_end = date(month_start.year, month_start.month + 1, 1) - timedelta(
                    days=1
                )

            # Get snapshots for start and end of month
            start_snapshot = next(
                (
                    s
                    for s in snapshots
                    if s["snapshot_date"] >= (month_start - timedelta(days=1)).isoformat()
                    and s["snapshot_date"] <= month_start.isoformat()
                ),
                None,
            )
            end_snapshot = next(
                (s for s in reversed(snapshots) if s["snapshot_date"] <= month_end.isoformat()),
                None,
            )

            if start_snapshot and end_snapshot:
                value_start = start_snapshot["total_value"]
                value_end = end_snapshot["total_value"]
                change_amount = value_end - value_start
                change_percent = (
                    (change_amount / value_start * 100) if value_start > 0 else 0
                )

                metrics.append(
                    SnapshotMetrics(
                        period_start=month_start,
                        period_end=month_end,
                        value_start=value_start,
                        value_end=value_end,
                        change_amount=change_amount,
                        change_percent=change_percent,
                    )
                )

    return metrics
