"""
Script to backfill historical portfolio snapshots for testing.
Creates realistic-looking historical data based on current portfolio value.

Usage:
    python -m scripts.backfill_snapshots --days 30
"""

import asyncio
from datetime import date, timedelta
from supabase import create_client, Client
import os
import random
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")


async def backfill_historical_snapshots(portfolio_id: str, days: int = 30):
    """Create historical snapshots with realistic daily variation"""

    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print("Error: Environment variables not set")
        return

    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    # Get the most recent snapshot to base historical data on
    recent = supabase.table("portfolio_snapshots")\
        .select("*")\
        .eq("portfolio_id", portfolio_id)\
        .order("snapshot_date", desc=True)\
        .limit(1)\
        .execute()

    if not recent.data:
        print(f"No existing snapshot found for portfolio {portfolio_id}")
        print("Run capture_snapshots.py first to create today's snapshot")
        return

    current_snapshot = recent.data[0]
    current_value = float(current_snapshot["total_value"])
    invested = float(current_snapshot["invested_value"])

    print(f"Backfilling {days} days of historical data...")
    print(f"Current value: ₹{current_value:.2f}")
    print("=" * 60)

    # Create historical snapshots with realistic daily variations
    value = current_value

    for days_ago in range(1, days + 1):
        snapshot_date = date.today() - timedelta(days=days_ago)

        # Skip weekends (market closed)
        if snapshot_date.weekday() >= 5:  # Saturday = 5, Sunday = 6
            continue

        # Random daily change: -3% to +3%
        daily_change_pct = random.uniform(-3.0, 3.0)
        daily_change = value * (daily_change_pct / 100)
        value = max(value - daily_change, invested * 0.8)  # Don't go below 80% of invested

        returns_amount = value - invested
        returns_percent = (returns_amount / invested * 100) if invested > 0 else 0

        try:
            supabase.table("portfolio_snapshots").upsert({
                "portfolio_id": portfolio_id,
                "snapshot_date": snapshot_date.isoformat(),
                "total_value": round(value, 2),
                "invested_value": invested,
                "returns_amount": round(returns_amount, 2),
                "returns_percent": round(returns_percent, 4),
                "holdings_count": current_snapshot["holdings_count"],
                "snapshot_data": None,
            }, on_conflict="portfolio_id,snapshot_date").execute()

            print(f"{snapshot_date} | Value: ₹{value:,.2f} | Change: {daily_change_pct:+.2f}% | Returns: {returns_percent:+.2f}%")

        except Exception as e:
            print(f"Error for {snapshot_date}: {e}")

    print("=" * 60)
    print("✓ Backfill complete!")
    print(f"\nNow you have {days} days of historical data for charts.")


async def backfill_all_portfolios(days: int = 30):
    """Backfill all portfolios that have at least one snapshot"""

    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print("Error: Environment variables not set")
        return

    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    # Get all portfolios with at least one snapshot
    result = supabase.table("portfolio_snapshots")\
        .select("portfolio_id")\
        .execute()

    if not result.data:
        print("No snapshots found. Run capture_snapshots.py first.")
        return

    portfolio_ids = list(set(snap["portfolio_id"] for snap in result.data))

    print(f"Found {len(portfolio_ids)} portfolio(s) with snapshots\n")

    for portfolio_id in portfolio_ids:
        print(f"\nPortfolio: {portfolio_id[:8]}...")
        await backfill_historical_snapshots(portfolio_id, days)


if __name__ == "__main__":
    import sys

    days = 30  # Default to 30 days

    # Check for --days argument
    if "--days" in sys.argv:
        idx = sys.argv.index("--days")
        if idx + 1 < len(sys.argv):
            days = int(sys.argv[idx + 1])

    print(f"Backfilling {days} days of historical snapshots...\n")
    asyncio.run(backfill_all_portfolios(days))
