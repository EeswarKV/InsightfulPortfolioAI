"""
Script to capture daily portfolio snapshots.
Run this script at end of trading day to store portfolio values for performance tracking.

Usage:
    python -m scripts.capture_snapshots
"""

import asyncio
from datetime import date
from supabase import create_client, Client
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")  # Use service role for admin access


async def fetch_live_price(symbol: str) -> float | None:
    """Fetch live price for a symbol from Yahoo Finance"""
    import httpx

    try:
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}.NS"
        params = {"region": "IN", "interval": "1d", "range": "1d"}

        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params, timeout=10.0)
            if response.status_code == 200:
                data = response.json()
                result = data.get("chart", {}).get("result", [])
                if result:
                    meta = result[0].get("meta", {})
                    return meta.get("regularMarketPrice") or meta.get("previousClose")
    except Exception as e:
        print(f"Error fetching price for {symbol}: {e}")

    return None


async def calculate_portfolio_value(
    supabase: Client, portfolio_id: str
) -> dict | None:
    """Calculate current portfolio value based on holdings and live prices"""
    # Fetch holdings for this portfolio
    holdings_result = (
        supabase.table("holdings")
        .select("*")
        .eq("portfolio_id", portfolio_id)
        .execute()
    )

    holdings = holdings_result.data
    if not holdings:
        return None

    total_value = 0.0
    invested_value = 0.0
    holdings_count = len(holdings)
    snapshot_data = []

    print(f"  Processing {holdings_count} holdings...")

    for holding in holdings:
        symbol = holding["symbol"]
        qty = float(holding["quantity"])
        avg_cost = float(holding["avg_cost"])

        # Fetch live price
        live_price = await fetch_live_price(symbol)
        if live_price is None:
            live_price = avg_cost  # Fallback to cost if price unavailable
            print(f"    Warning: Using avg_cost for {symbol}")

        holding_value = qty * live_price
        holding_invested = qty * avg_cost

        total_value += holding_value
        invested_value += holding_invested

        snapshot_data.append(
            {
                "symbol": symbol,
                "quantity": qty,
                "avg_cost": avg_cost,
                "current_price": live_price,
                "value": holding_value,
            }
        )

        print(f"    {symbol}: {qty} @ ₹{live_price:.2f} = ₹{holding_value:.2f}")

    returns_amount = total_value - invested_value
    returns_percent = (
        (returns_amount / invested_value * 100) if invested_value > 0 else 0.0
    )

    return {
        "total_value": total_value,
        "invested_value": invested_value,
        "returns_amount": returns_amount,
        "returns_percent": returns_percent,
        "holdings_count": holdings_count,
        "snapshot_data": snapshot_data,
    }


async def capture_snapshots():
    """Capture snapshots for all portfolios"""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print("Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env file")
        print(f"Current SUPABASE_URL: {SUPABASE_URL[:30] if SUPABASE_URL else 'NOT SET'}")
        print(f"Current SUPABASE_SERVICE_KEY: {'SET' if SUPABASE_SERVICE_KEY else 'NOT SET'}")
        return

    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    today = date.today()

    print(f"Capturing portfolio snapshots for {today}...")
    print("=" * 60)

    # Fetch all portfolios
    portfolios_result = supabase.table("portfolios").select("id, name, client_id").execute()
    portfolios = portfolios_result.data

    print(f"Found {len(portfolios)} portfolios\n")

    for portfolio in portfolios:
        portfolio_id = portfolio["id"]
        portfolio_name = portfolio["name"]

        print(f"Portfolio: {portfolio_name} ({portfolio_id[:8]}...)")

        # Calculate portfolio value
        metrics = await calculate_portfolio_value(supabase, portfolio_id)

        if not metrics:
            print("  No holdings found, skipping...\n")
            continue

        # Insert snapshot
        try:
            result = (
                supabase.table("portfolio_snapshots")
                .upsert(
                    {
                        "portfolio_id": portfolio_id,
                        "snapshot_date": today.isoformat(),
                        "total_value": metrics["total_value"],
                        "invested_value": metrics["invested_value"],
                        "returns_amount": metrics["returns_amount"],
                        "returns_percent": metrics["returns_percent"],
                        "holdings_count": metrics["holdings_count"],
                        "snapshot_data": metrics["snapshot_data"],
                    },
                    on_conflict="portfolio_id,snapshot_date",
                )
                .execute()
            )

            print(
                f"  ✓ Snapshot saved: Total=₹{metrics['total_value']:.2f}, "
                f"Returns={metrics['returns_percent']:+.2f}%\n"
            )

        except Exception as e:
            print(f"  ✗ Error saving snapshot: {e}\n")

    print("=" * 60)
    print("Snapshot capture complete!")


if __name__ == "__main__":
    asyncio.run(capture_snapshots())
