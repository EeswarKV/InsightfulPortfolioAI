# Transfer Holdings from Demo Client to New Client

## 🎯 Goal
Copy all holdings (and optionally transactions) from your demo/test client to a new real client.

---

## ✅ Method 1: Using Supabase SQL Editor (Recommended - 5 minutes)

### Step 1: Open Supabase SQL Editor

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: **PortfolioAPI**
3. Click **SQL Editor** in left sidebar
4. Click **New Query**

### Step 2: Find Your Client IDs

Paste and run this query:

```sql
SELECT
  id,
  full_name,
  email,
  created_at
FROM public.users
WHERE role = 'client'
ORDER BY created_at DESC;
```

**Result**: You'll see a list of clients. Copy the IDs:
- **Demo client ID**: (the old/test client)
- **New client ID**: (your new real client)

### Step 3: Find Portfolio IDs

Replace the client IDs below and run:

```sql
SELECT
  id as portfolio_id,
  client_id,
  name,
  created_at
FROM public.portfolios
WHERE client_id IN (
  'paste-demo-client-id-here',
  'paste-new-client-id-here'
)
ORDER BY created_at;
```

**Result**: Copy the portfolio IDs:
- **Demo portfolio ID**:
- **New portfolio ID**:

### Step 4: Transfer Holdings

Replace the portfolio IDs and run:

```sql
INSERT INTO public.holdings (
  portfolio_id,
  symbol,
  quantity,
  avg_cost,
  asset_type,
  source,
  manual_price,
  last_price_update,
  created_at
)
SELECT
  'paste-new-portfolio-id-here'::uuid as portfolio_id,
  symbol,
  quantity,
  avg_cost,
  asset_type,
  source,
  manual_price,
  last_price_update,
  NOW() as created_at
FROM public.holdings
WHERE portfolio_id = 'paste-demo-portfolio-id-here'::uuid;
```

**Result**: You'll see: `INSERT 0 X` where X is the number of holdings copied.

### Step 5: Transfer Transactions (Optional)

If you want to copy transaction history too:

```sql
INSERT INTO public.transactions (
  portfolio_id,
  symbol,
  type,
  quantity,
  price,
  date,
  created_at
)
SELECT
  'paste-new-portfolio-id-here'::uuid as portfolio_id,
  symbol,
  type,
  quantity,
  price,
  date,
  NOW() as created_at
FROM public.transactions
WHERE portfolio_id = 'paste-demo-portfolio-id-here'::uuid;
```

### Step 6: Verify Transfer

Check if holdings were copied:

```sql
SELECT
  symbol,
  quantity,
  avg_cost,
  asset_type,
  created_at
FROM public.holdings
WHERE portfolio_id = 'paste-new-portfolio-id-here'::uuid
ORDER BY created_at DESC;
```

**Success!** If you see all the holdings, the transfer worked! ✅

---

## ✅ Method 2: Using the Mobile App (Manual - Slower)

If you prefer not to use SQL:

### For Each Holding:

1. **View Demo Client Portfolio**
   - Note down each holding's details:
     - Symbol
     - Quantity
     - Average cost
     - Asset type

2. **Open New Client Portfolio**
   - Click "Add Holding"
   - Enter the same details
   - Save

3. **Repeat** for each holding

**Time**: ~2 minutes per holding

---

## 🧹 Clean Up Demo Data (Optional)

After verifying the transfer was successful, you can delete the demo client's data:

```sql
-- Delete demo holdings
DELETE FROM public.holdings
WHERE portfolio_id = 'demo-portfolio-id-here'::uuid;

-- Delete demo transactions
DELETE FROM public.transactions
WHERE portfolio_id = 'demo-portfolio-id-here'::uuid;

-- Delete demo portfolio
DELETE FROM public.portfolios
WHERE id = 'demo-portfolio-id-here'::uuid;

-- Delete demo client (optional)
DELETE FROM public.users
WHERE id = 'demo-client-id-here'::uuid;
```

**⚠️ WARNING**: This is permanent! Only run after verifying transfer was successful.

---

## 📊 Quick Reference: SQL Commands

### Find Clients
```sql
SELECT id, full_name, email FROM public.users WHERE role = 'client';
```

### Find Portfolios
```sql
SELECT id, client_id, name FROM public.portfolios WHERE client_id = 'client-id-here';
```

### Count Holdings Before Transfer
```sql
SELECT COUNT(*) FROM public.holdings WHERE portfolio_id = 'demo-portfolio-id';
```

### Count Holdings After Transfer
```sql
SELECT COUNT(*) FROM public.holdings WHERE portfolio_id = 'new-portfolio-id';
```

### View All Holdings for a Client
```sql
SELECT
  h.symbol,
  h.quantity,
  h.avg_cost,
  h.asset_type,
  p.name as portfolio_name,
  u.full_name as client_name
FROM public.holdings h
JOIN public.portfolios p ON h.portfolio_id = p.id
JOIN public.users u ON p.client_id = u.id
WHERE u.id = 'client-id-here';
```

---

## 🎯 Complete Example

Here's a complete example with sample IDs:

```sql
-- 1. Find clients (run this first)
SELECT id, full_name, email FROM public.users WHERE role = 'client';

-- Example output:
-- id: abc123...  | full_name: Demo Client  | email: demo@test.com
-- id: xyz789...  | full_name: John Smith   | email: john@example.com

-- 2. Find portfolios
SELECT id, client_id, name FROM public.portfolios
WHERE client_id IN ('abc123...', 'xyz789...');

-- Example output:
-- id: portfolio-abc... | client_id: abc123... | name: Main Portfolio
-- id: portfolio-xyz... | client_id: xyz789... | name: Main Portfolio

-- 3. Copy holdings
INSERT INTO public.holdings (
  portfolio_id, symbol, quantity, avg_cost, asset_type, source, manual_price, last_price_update, created_at
)
SELECT
  'portfolio-xyz...'::uuid,  -- John's portfolio
  symbol, quantity, avg_cost, asset_type, source, manual_price, last_price_update, NOW()
FROM public.holdings
WHERE portfolio_id = 'portfolio-abc...'::uuid;  -- Demo portfolio

-- Result: INSERT 0 5 (copied 5 holdings)
```

---

## ✅ Verification Checklist

After transfer:

- [ ] Run query to count holdings in new portfolio
- [ ] Check that count matches demo portfolio
- [ ] Open new client in app and verify holdings display
- [ ] Check that performance metrics calculate correctly
- [ ] Verify transactions were copied (if applicable)
- [ ] Test adding a new holding to ensure nothing broke

---

## 🆘 Troubleshooting

### "INSERT 0 0" - Nothing copied
**Cause**: Wrong portfolio IDs
**Fix**: Double-check the portfolio IDs from Step 2

### "Duplicate key violation"
**Cause**: Holdings already exist in new portfolio
**Fix**: Either delete existing holdings first, or skip this transfer

### "Foreign key violation"
**Cause**: Invalid portfolio ID
**Fix**: Verify the portfolio ID exists in the portfolios table

### Can't find demo client
**Cause**: Demo client might have different role or name
**Fix**: Run `SELECT * FROM public.users` to see all users

---

## 💡 Pro Tips

1. **Test First**: Try copying just one holding to verify IDs are correct
   ```sql
   -- Copy just first holding
   INSERT INTO public.holdings (...)
   SELECT ... FROM public.holdings
   WHERE portfolio_id = 'demo-id'::uuid
   LIMIT 1;
   ```

2. **Backup**: Supabase has automatic backups, but you can export data first:
   - Table Editor → Holdings → Export to CSV

3. **Keep Demo**: Don't delete demo client until you're 100% sure transfer worked

---

**Ready? Open Supabase SQL Editor and start with Step 2!** 🚀
