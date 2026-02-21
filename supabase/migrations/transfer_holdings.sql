-- Transfer Holdings from Demo Client to New Client
-- Run this in Supabase SQL Editor

-- ========================================
-- STEP 1: Find Client IDs and Portfolio IDs
-- ========================================

-- First, let's see all clients to identify the demo and new client
SELECT
  id,
  full_name,
  email,
  created_at
FROM public.users
WHERE role = 'client'
ORDER BY created_at DESC;

-- Note the IDs:
-- Demo client ID: _____________
-- New client ID: _____________

-- ========================================
-- STEP 2: Find Portfolio IDs
-- ========================================

-- Find portfolios for both clients
SELECT
  id as portfolio_id,
  client_id,
  name,
  created_at
FROM public.portfolios
WHERE client_id IN (
  -- Replace these with actual client IDs from Step 1
  'demo-client-id-here',
  'new-client-id-here'
)
ORDER BY created_at;

-- Note the IDs:
-- Demo portfolio ID: _____________
-- New portfolio ID: _____________

-- ========================================
-- STEP 3: Transfer Holdings
-- ========================================

-- Copy all holdings from demo portfolio to new portfolio
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
  'new-portfolio-id-here'::uuid as portfolio_id,  -- Replace with new portfolio ID
  symbol,
  quantity,
  avg_cost,
  asset_type,
  source,
  manual_price,
  last_price_update,
  NOW() as created_at
FROM public.holdings
WHERE portfolio_id = 'demo-portfolio-id-here'::uuid;  -- Replace with demo portfolio ID

-- ========================================
-- STEP 4: Transfer Transactions (Optional)
-- ========================================

-- Copy all transactions from demo portfolio to new portfolio
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
  'new-portfolio-id-here'::uuid as portfolio_id,  -- Replace with new portfolio ID
  symbol,
  type,
  quantity,
  price,
  date,
  NOW() as created_at
FROM public.transactions
WHERE portfolio_id = 'demo-portfolio-id-here'::uuid;  -- Replace with demo portfolio ID

-- ========================================
-- STEP 5: Verify Transfer
-- ========================================

-- Check holdings in new portfolio
SELECT
  symbol,
  quantity,
  avg_cost,
  asset_type,
  created_at
FROM public.holdings
WHERE portfolio_id = 'new-portfolio-id-here'::uuid  -- Replace with new portfolio ID
ORDER BY created_at DESC;

-- Check transactions in new portfolio
SELECT
  symbol,
  type,
  quantity,
  price,
  date
FROM public.transactions
WHERE portfolio_id = 'new-portfolio-id-here'::uuid  -- Replace with new portfolio ID
ORDER BY date DESC;

-- ========================================
-- STEP 6: Clean Up Demo Data (Optional)
-- ========================================

-- If you want to delete the demo client's data after transfer:
-- WARNING: This is permanent! Only run after verifying transfer was successful

-- Delete demo holdings
-- DELETE FROM public.holdings
-- WHERE portfolio_id = 'demo-portfolio-id-here'::uuid;

-- Delete demo transactions
-- DELETE FROM public.transactions
-- WHERE portfolio_id = 'demo-portfolio-id-here'::uuid;

-- Delete demo portfolio
-- DELETE FROM public.portfolios
-- WHERE id = 'demo-portfolio-id-here'::uuid;

-- Delete demo client
-- DELETE FROM public.users
-- WHERE id = 'demo-client-id-here'::uuid;
