# Manual NAV Update - Integration Guide

## ✅ Already Completed

1. **Database Migration** - `007_add_manual_nav_fields.sql`
2. **Backend API** - PATCH endpoint `/portfolios/{id}/holdings/{holding_id}/price`
3. **Frontend Types** - Updated `DBHolding` interface
4. **Frontend API** - `updateManualNAV()` function
5. **UpdateNAVModal Component** - Complete modal UI

## 🔧 Integration Steps

### Step 1: Export the Modal Component

**File**: `apps/mobile/components/modals/index.ts`

Add this line:
```typescript
export { UpdateNAVModal } from "./UpdateNAVModal";
```

### Step 2: Add Update NAV Button to HoldingRow

**File**: `apps/mobile/components/cards/HoldingRow.tsx`

Find the HoldingRow component and add an `onUpdateNAV` prop:

```typescript
interface HoldingRowProps {
  dbHolding: DBHolding;
  onEdit?: (holding: DBHolding) => void;
  onDelete?: (holding: DBHolding) => void;
  onUpdateNAV?: (holding: DBHolding) => void;  // ← ADD THIS
}

// In the component JSX, after Edit/Delete buttons:
{onUpdateNAV && dbHolding.asset_type !== "stock" && (
  <TouchableOpacity
    style={styles.navButton}
    onPress={() => onUpdateNAV(dbHolding)}
  >
    <Feather name="edit-3" size={14} color={theme.colors.accent} />
    <Text style={styles.navButtonText}>
      {dbHolding.manual_price ? "Update NAV" : "Set NAV"}
    </Text>
  </TouchableOpacity>
)}

// Add these styles:
const styles = StyleSheet.create({
  // ... existing styles
  navButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: theme.colors.accentSoft,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
  navButtonText: {
    color: theme.colors.accent,
    fontSize: 11,
    fontWeight: "600",
  },
});
```

### Step 3: Add Modal to Portfolio Detail Screen

**File**: `apps/mobile/app/(manager)/portfolio/[id].tsx`

At the end of the component's return statement, before the closing tag, add:

```typescript
{/* Update NAV Modal */}
<UpdateNAVModal
  visible={showNAVModal}
  holding={updatingNAVHolding}
  onClose={() => {
    setShowNAVModal(false);
    setUpdatingNAVHolding(null);
  }}
  onUpdate={handleUpdateNAV}
/>
```

### Step 4: Update Portfolio Calculations

**File**: `apps/mobile/lib/marketData.ts`

In the `calculatePortfolioMetrics` function, update the current price logic:

```typescript
// For each holding, use manual_price if available:
const currentPrice = holding.manual_price || livePrices.get(holding.symbol)?.price || holding.avg_cost;
```

### Step 5: Run Database Migration

In Supabase SQL Editor, run:
```sql
-- From: supabase/migrations/007_add_manual_nav_fields.sql
ALTER TABLE public.holdings
  ADD COLUMN IF NOT EXISTS manual_price numeric(15,2),
  ADD COLUMN IF NOT EXISTS last_price_update timestamptz;

CREATE INDEX IF NOT EXISTS idx_holdings_last_price_update
  ON public.holdings(last_price_update);
```

## 🎯 How It Works

1. **For Stocks**: Yahoo Finance provides live prices automatically
2. **For Mutual Funds/Bonds**: Click "Set NAV" button → Enter current NAV → Saved
3. **Portfolio Calculations**: Use manual_price (if set) → fallback to live price → fallback to avg_cost
4. **Last Updated**: Shows timestamp of when NAV was last manually updated

## 📱 User Flow

```
Portfolio Detail Screen
  └─ Holdings List
      ├─ RELIANCE.NS (Stock) → Live price ✅
      ├─ ICICI Prudential MF → [Set NAV] button
      │   └─ Click → Modal opens
      │       └─ Enter: ₹48.20
      │           └─ Save → Holdings refresh
      │               └─ Shows: Current ₹48.20 | Updated: 21-Feb-2026
      └─ SBI Bond → [Update NAV] button (if already set)
```

## 🔄 Auto-Refresh (Future Enhancement)

Later, you can add auto-fetch NAV using AMFI API:

```typescript
// apps/mobile/lib/mutualFundAPI.ts
export async function fetchMutualFundNAV(fundName: string): Promise<number> {
  // Call AMFI India or MoneyControl API
  // Return latest NAV
}

// In portfolio calculations:
if (holding.asset_type === "mutual_fund") {
  const autoNAV = await fetchMutualFundNAV(holding.symbol);
  if (autoNAV) {
    currentPrice = autoNAV;
  }
}
```

## ✅ Testing Checklist

- [ ] Run database migration
- [ ] Add manual NAV to a mutual fund holding
- [ ] Verify portfolio calculations use the manual price
- [ ] Check "Last Updated" timestamp displays correctly
- [ ] Edit existing manual NAV
- [ ] Verify stocks still use Yahoo Finance live prices
- [ ] Test on both mobile and web views

## 🎉 Result

Your portfolio now accurately tracks mutual funds, bonds, and other assets that don't have live market data!
