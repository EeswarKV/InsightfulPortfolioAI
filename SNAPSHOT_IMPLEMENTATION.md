# Portfolio Snapshot Implementation Guide

## Overview
This implements accurate daily/monthly/yearly portfolio performance tracking using historical snapshots instead of linear interpolation.

## What's Been Implemented

### 1. Database Migration ✅
**File**: `supabase/migrations/008_portfolio_snapshots.sql`

Creates `portfolio_snapshots` table with:
- Daily portfolio values (total_value, invested_value, returns_amount, returns_percent)
- Detailed snapshot data (JSON with holding-level breakdown)
- Indexes for efficient querying
- RLS policies for security

**Action Required**: Run this migration in Supabase SQL Editor

### 2. Backend API ✅
**Files**:
- `apps/api/app/models/snapshot.py` - Data models
- `apps/api/app/routers/snapshots.py` - API endpoints
- `apps/api/app/main.py` - Router registration

**Endpoints Created**:
- `POST /portfolios/{id}/snapshots` - Create/update snapshot
- `GET /portfolios/{id}/snapshots?start_date=X&end_date=Y` - Get historical snapshots
- `GET /portfolios/{id}/performance?period=daily|monthly|yearly` - Get performance metrics

### 3. Snapshot Capture Script ✅
**File**: `apps/api/scripts/capture_snapshots.py`

Daily script to:
- Fetch all portfolios
- Get live prices for each holding
- Calculate portfolio metrics
- Store snapshot in database

**Usage**:
```bash
cd apps/api
python -m scripts.capture_snapshots
```

### 4. Frontend API Client ✅
**File**: `apps/mobile/lib/api.ts`

Added `fetchPortfolioSnapshots()` function to retrieve historical data.

---

## Next Steps to Complete

### Step 1: Run Database Migration

Open Supabase SQL Editor and run:
```sql
-- Copy contents from supabase/migrations/008_portfolio_snapshots.sql
```

### Step 2: Capture Initial Snapshots

```bash
# From apps/api directory
cd apps/api

# Install dependencies if needed
pip install httpx python-dotenv

# Run snapshot capture
python -m scripts.capture_snapshots
```

This will:
- Fetch all portfolios
- Get current live prices
- Create today's snapshot for each portfolio

### Step 3: Backfill Historical Data (Optional)

To populate historical snapshots, you can:
1. **Manual backfill**: Modify the script to set different snapshot dates
2. **Import from transactions**: Calculate historical values based on transaction history

Example backfill (modify `capture_snapshots.py`):
```python
from datetime import timedelta

# Capture snapshots for last 30 days
for days_ago in range(30, 0, -1):
    snapshot_date = date.today() - timedelta(days=days_ago)
    # ... capture snapshot with snapshot_date instead of today
```

### Step 4: Update Frontend Chart Logic

**File to modify**: `apps/mobile/lib/chartUtils.ts`

Replace `computeHoldingsPerformance` with snapshot-based version:

```typescript
import { fetchPortfolioSnapshots } from "./api";

export async function computeHoldingsPerformanceFromSnapshots(
  portfolioId: string,
  period: ChartPeriod
): Promise<BarData[]> {
  const now = new Date();
  const labels: string[] = [];
  const values: number[] = [];

  // Determine date range
  let startDate: Date;
  if (period === "daily") {
    startDate = new Date(now);
    startDate.setDate(now.getDate() - 7);
  } else if (period === "monthly") {
    startDate = new Date(now);
    startDate.setMonth(now.getMonth() - 6);
  } else {
    startDate = new Date(now);
    startDate.setFullYear(now.getFullYear() - 5);
  }

  // Fetch snapshots
  const snapshots = await fetchPortfolioSnapshots(
    portfolioId,
    startDate.toISOString().split('T')[0],
    now.toISOString().split('T')[0]
  );

  if (snapshots.length === 0) {
    return []; // No data yet
  }

  // Group by period and calculate changes
  if (period === "daily") {
    // Last 7 days
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now);
      day.setDate(now.getDate() - i);
      const dayStr = day.toISOString().split('T')[0];

      const daySnapshot = snapshots.find(s => s.snapshot_date === dayStr);
      const prevDay = new Date(day);
      prevDay.setDate(prevDay.getDate() - 1);
      const prevDayStr = prevDay.toISOString().split('T')[0];
      const prevSnapshot = snapshots.find(s => s.snapshot_date === prevDayStr);

      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      labels.push(i === 0 ? "Today" : dayNames[day.getDay()]);

      if (daySnapshot && prevSnapshot) {
        const change = daySnapshot.total_value - prevSnapshot.total_value;
        values.push(change);
      } else {
        values.push(0);
      }
    }
  } else if (period === "monthly") {
    // Last 6 months
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      labels.push(monthNames[monthStart.getMonth()]);

      // Find closest snapshots to month boundaries
      const startSnapshot = snapshots.find(s => s.snapshot_date >= monthStart.toISOString().split('T')[0]);
      const endSnapshot = snapshots.reverse().find(s => s.snapshot_date <= monthEnd.toISOString().split('T')[0]);

      if (startSnapshot && endSnapshot) {
        const change = endSnapshot.total_value - startSnapshot.total_value;
        values.push(change);
      } else {
        values.push(0);
      }
    }
  } else {
    // Last 5 years
    for (let i = 4; i >= 0; i--) {
      const year = now.getFullYear() - i;
      labels.push(`${year}`);

      const yearStart = new Date(year, 0, 1);
      const yearEnd = new Date(year, 11, 31);

      const startSnapshot = snapshots.find(s => s.snapshot_date >= yearStart.toISOString().split('T')[0]);
      const endSnapshot = snapshots.reverse().find(s => s.snapshot_date <= yearEnd.toISOString().split('T')[0]);

      if (startSnapshot && endSnapshot) {
        const change = endSnapshot.total_value - startSnapshot.total_value;
        values.push(change);
      } else {
        values.push(0);
      }
    }
  }

  return labels.map((label, i) => ({ label, value: values[i] }));
}
```

### Step 5: Update Dashboard Components

**Files to modify**:
- `apps/mobile/app/(manager)/index.tsx`
- `apps/mobile/app/(client)/index.tsx`
- `apps/mobile/app/(manager)/portfolio/[id].tsx`

Replace chart data calculation with:
```typescript
const [chartData, setChartData] = useState<BarData[]>([]);

useEffect(() => {
  if (portfolioId) {
    computeHoldingsPerformanceFromSnapshots(portfolioId, chartPeriod)
      .then(setChartData)
      .catch(console.error);
  }
}, [portfolioId, chartPeriod]);
```

### Step 6: Set Up Daily Automation

Choose one of these options:

#### Option A: Cron Job (Linux/Mac)
```bash
# Add to crontab
# Run at 6 PM daily (after market close)
0 18 * * * cd /path/to/PortfolioAPI/apps/api && python -m scripts.capture_snapshots
```

#### Option B: GitHub Actions (Recommended)
Create `.github/workflows/daily-snapshots.yml`:
```yaml
name: Daily Portfolio Snapshots

on:
  schedule:
    - cron: '30 12 * * *'  # 6:00 PM IST (12:30 PM UTC)
  workflow_dispatch:  # Allow manual trigger

jobs:
  capture-snapshots:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: |
          cd apps/api
          pip install -r requirements.txt
      - name: Capture snapshots
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
        run: |
          cd apps/api
          python -m scripts.capture_snapshots
```

#### Option C: Supabase pg_cron (Advanced)
Use Supabase's built-in cron to call a database function that triggers the API.

---

## Testing

1. **Manual snapshot capture**:
   ```bash
   python -m scripts.capture_snapshots
   ```

2. **Verify in Supabase**:
   ```sql
   SELECT * FROM portfolio_snapshots ORDER BY snapshot_date DESC LIMIT 10;
   ```

3. **Test API endpoint**:
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     "http://localhost:8000/portfolios/{id}/snapshots"
   ```

4. **Check frontend chart**: Should now show actual daily/monthly/yearly performance

---

## Benefits

✅ **Accurate Performance**: Real trading day gains/losses, not interpolated estimates
✅ **Historical Analysis**: Track portfolio performance over time
✅ **Percentage Labels**: Show +5.2% or -2.1% on each bar
✅ **Disaster Days**: See exactly how much was lost on bad trading days
✅ **Month-to-Date**: Current month shows performance so far
✅ **Year-over-Year**: Compare yearly performance accurately

---

## Troubleshooting

**No data showing on chart?**
- Run `python -m scripts.capture_snapshots` to create today's snapshot
- Backfill historical data for past dates

**Prices not updating?**
- Check Yahoo Finance API is accessible
- Verify symbols have .NS suffix for Indian stocks
- Check console logs in capture_snapshots.py

**Frontend errors?**
- Ensure migration has been run
- Check API endpoints are accessible
- Verify authentication tokens are valid

---

## Future Enhancements

- **Intraday snapshots**: Capture values multiple times per day
- **Benchmark comparison**: Compare against NIFTY 50 or S&P 500
- **Alert thresholds**: Notify on >5% daily moves
- **Export reports**: Generate PDF performance reports
- **AI insights**: Use snapshots for trend analysis and predictions
