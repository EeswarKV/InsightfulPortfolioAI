# Portfolio Snapshot System - Implementation Status

## ✅ Completed

### 1. Database Setup
- ✅ Created `portfolio_snapshots` table
- ✅ Added RLS policies for security
- ✅ Created indexes for performance

**Action**: Run migration in Supabase SQL Editor:
```sql
-- Copy from: supabase/migrations/008_portfolio_snapshots.sql
```

### 2. Backend API
- ✅ Created `/portfolios/{id}/snapshots` endpoints
- ✅ Created snapshot data models
- ✅ Registered snapshot router in main.py

### 3. Snapshot Capture Script
- ✅ Created Python script to capture daily snapshots
- ✅ Fetches live prices from Yahoo Finance
- ✅ Stores snapshot data in database
- ✅ Fixed environment variable loading
- ✅ Successfully tested and working

**Test Result**:
```
Portfolio: Main Portfolio (4f668514...)
  Processing 1 holdings...
    TCS.NS: 18.0 @ ₹2014.00 = ₹36252.00
  ✓ Snapshot saved: Total=₹36252.00, Returns=+0.00%
```

### 4. Frontend API Integration
- ✅ Added `fetchPortfolioSnapshots()` function
- ✅ Created `PortfolioSnapshot` type

### 5. Chart Utilities
- ✅ Added `computePerformanceFromSnapshots()` function
- ✅ Calculates actual day/month/year changes from snapshots
- ✅ Includes percentage calculations

---

## 🚧 Next Steps

### Step 1: Backfill Historical Data (Recommended)

Since you only have today's snapshot, create some historical snapshots for testing:

```sql
-- In Supabase SQL Editor, manually insert past snapshots
-- Replace 'YOUR_PORTFOLIO_ID' with actual ID from the script output (4f668514...)

INSERT INTO portfolio_snapshots (portfolio_id, snapshot_date, total_value, invested_value, returns_amount, returns_percent, holdings_count) VALUES
  ('4f668514-xxxx-xxxx-xxxx-xxxxxxxxxxxx', '2026-02-19', 35800, 36252, -452, -1.25, 1),
  ('4f668514-xxxx-xxxx-xxxx-xxxxxxxxxxxx', '2026-02-18', 36100, 36252, -152, -0.42, 1),
  ('4f668514-xxxx-xxxx-xxxx-xxxxxxxxxxxx', '2026-02-17', 36500, 36252, 248, 0.68, 1),
  ('4f668514-xxxx-xxxx-xxxx-xxxxxxxxxxxx', '2026-02-14', 35900, 36252, -352, -0.97, 1),
  ('4f668514-xxxx-xxxx-xxxx-xxxxxxxxxxxx', '2026-02-13', 36300, 36252, 48, 0.13, 1),
  ('4f668514-xxxx-xxxx-xxxx-xxxxxxxxxxxx', '2026-02-12', 35700, 36252, -552, -1.52, 1);
```

This will give you 7 days of data to test the daily chart.

### Step 2: Update Dashboards to Use Snapshots

#### Manager Dashboard (`apps/mobile/app/(manager)/index.tsx`)

Add near line 29-30:
```typescript
const [useSnapshots, setUseSnapshots] = useState(false);
const [snapshotData, setSnapshotData] = useState<PortfolioSnapshot[]>([]);
```

Update imports (around line 12):
```typescript
import { computePerformanceFromSnapshots } from "../../lib/chartUtils";
import { fetchPortfolioSnapshots } from "../../lib/api";
```

Add effect to fetch snapshots (after line 45):
```typescript
// Fetch snapshots for all client portfolios
useEffect(() => {
  const fetchAllSnapshots = async () => {
    if (portfolios.length > 0) {
      try {
        // For manager dashboard, combine snapshots from all portfolios
        const allSnapshots: PortfolioSnapshot[] = [];
        for (const portfolio of portfolios) {
          const snapshots = await fetchPortfolioSnapshots(portfolio.id);
          allSnapshots.push(...snapshots);
        }
        setSnapshotData(allSnapshots);
        setUseSnapshots(allSnapshots.length > 0);
      } catch (error) {
        console.error("Failed to fetch snapshots:", error);
      }
    }
  };
  fetchAllSnapshots();
}, [portfolios]);
```

Update chart data (replace line 115-119):
```typescript
const chartData = useSnapshots && snapshotData.length > 0
  ? computePerformanceFromSnapshots(snapshotData, chartPeriod)
  : computeHoldingsPerformance(
      allHoldingsForChart,
      portfolioMetrics.livePrices,
      chartPeriod
    );
```

#### Client Dashboard (`apps/mobile/app/(client)/index.tsx`)

Apply similar changes:
- Add state for snapshots
- Fetch snapshots for client's portfolio
- Use snapshot-based chart when available

#### Client Portfolio Detail (`apps/mobile/app/(manager)/portfolio/[id].tsx`)

Same pattern:
- Fetch snapshots for specific portfolio
- Use snapshot-based performance

### Step 3: Add Percentage Display to Charts

The `BarData` type now includes `percentage`. Update the `BarChart` component to display it:

**File**: `apps/mobile/components/charts/BarChart.tsx`

Add percentage label above bars:
```typescript
{data.map((item, index) => (
  <View key={index}>
    {item.percentage !== undefined && (
      <Text style={styles.percentLabel}>
        {item.percentage >= 0 ? '+' : ''}{item.percentage.toFixed(1)}%
      </Text>
    )}
    {/* Existing bar rendering */}
  </View>
))}
```

### Step 4: Set Up Daily Automation

#### Option A: GitHub Actions (Recommended)

Create `.github/workflows/daily-snapshots.yml`:

```yaml
name: Daily Portfolio Snapshots

on:
  schedule:
    - cron: '30 12 * * *'  # 6:00 PM IST daily
  workflow_dispatch:

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
          pip install httpx python-dotenv supabase
      - name: Capture snapshots
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
        run: |
          cd apps/api
          python -m scripts.capture_snapshots
```

Add secrets in GitHub: Settings → Secrets → Actions
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`

#### Option B: Windows Task Scheduler

1. Open Task Scheduler
2. Create Basic Task
3. Name: "Portfolio Snapshots"
4. Trigger: Daily at 6:00 PM
5. Action: Start a program
6. Program: `python`
7. Arguments: `-m scripts.capture_snapshots`
8. Start in: `C:\Users\eeswa\Documents\CODE\PortfolioAPI\apps\api`

---

## Testing Checklist

- [ ] Run migration in Supabase
- [ ] Run snapshot capture script manually
- [ ] Verify data in `portfolio_snapshots` table
- [ ] Backfill 7 days of historical data
- [ ] Update manager dashboard code
- [ ] Update client dashboard code
- [ ] Test chart shows actual performance
- [ ] Verify percentages display correctly
- [ ] Set up daily automation
- [ ] Test automation runs successfully

---

## Expected Results

Once complete, you'll see:

### Daily View
```
Thu: -1.2%   ↓ Red bar
Fri: +0.7%   ↑ Green bar
Mon: +1.5%   ↑ Green bar
Tue: -0.4%   ↓ Red bar
Wed: +0.3%   ↑ Green bar
Thu: -2.1%   ↓ Red bar (disaster day!)
Today: +0.5% ↑ Green bar
```

### Monthly View
```
Sep: +5.2%   ↑
Oct: -2.1%   ↓
Nov: +8.5%   ↑
Dec: +3.2%   ↑
Jan: +6.8%   ↑
Feb: +2.3%   ↑ (month-to-date)
```

### Yearly View
```
2021: +12.5% ↑
2022: -5.3%  ↓
2023: +18.7% ↑
2024: +15.2% ↑
2025: +8.4%  ↑ (year-to-date)
```

---

## Quick Commands Reference

```bash
# Capture snapshots manually
cd apps/api
python -m scripts.capture_snapshots

# Check recent snapshots
# (Run in Python or Supabase SQL Editor)
SELECT snapshot_date, total_value, returns_percent
FROM portfolio_snapshots
ORDER BY snapshot_date DESC
LIMIT 10;

# Backfill historical data (SQL)
# See Step 1 above

# Start API server (if needed)
cd apps/api
uvicorn app.main:app --reload

# Start mobile app
cd apps/mobile
npm start
```

---

## Troubleshooting

**Chart shows all zeros?**
- Need to backfill historical snapshots (see Step 1)
- Need at least 2 snapshots per period to calculate change

**Prices not updating?**
- Check Yahoo Finance API is accessible
- Add .NS suffix to Indian stock symbols
- Verify SUPABASE_SERVICE_KEY is set correctly

**Frontend not using snapshots?**
- Check console logs for fetch errors
- Verify `useSnapshots` state is true
- Ensure portfolio IDs match between frontend and database

---

For detailed implementation, see [SNAPSHOT_IMPLEMENTATION.md](./SNAPSHOT_IMPLEMENTATION.md)
