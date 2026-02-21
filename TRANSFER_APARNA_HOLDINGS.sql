-- ========================================
-- Transfer Holdings: Old Demo Client → Aparna Oruganti
-- ========================================
-- Old Client ID: 8a0f0b12-887d-482f-8d6e-da86a0761202
-- New Client ID: baa663fa-40ed-43fd-915c-436d2ecec7e8 (Aparna Oruganti)
-- ========================================

-- STEP 1: Find Portfolio IDs for both clients
-- Copy the portfolio IDs from the result

SELECT
  id as portfolio_id,
  client_id,
  name,
  created_at,
  CASE
    WHEN client_id = '8a0f0b12-887d-482f-8d6e-da86a0761202' THEN '← OLD (Demo)'
    WHEN client_id = 'baa663fa-40ed-43fd-915c-436d2ecec7e8' THEN '← NEW (Aparna)'
  END as client_label
FROM public.portfolios
WHERE client_id IN (
  '8a0f0b12-887d-482f-8d6e-da86a0761202',  -- Old client
  'baa663fa-40ed-43fd-915c-436d2ecec7e8'   -- Aparna
)
ORDER BY created_at;

-- ========================================
-- AFTER RUNNING ABOVE:
-- Copy the portfolio IDs here:
-- Old portfolio ID: _________________________
-- Aparna's portfolio ID: ____________________
-- ========================================


-- ========================================
-- STEP 2: Transfer Holdings
-- Replace the portfolio IDs below, then run
-- ========================================

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
  'PASTE-APARNA-PORTFOLIO-ID-HERE'::uuid as portfolio_id,  -- Replace with Aparna's portfolio ID
  symbol,
  quantity,
  avg_cost,
  asset_type,
  source,
  manual_price,
  last_price_update,
  NOW() as created_at
FROM public.holdings
WHERE portfolio_id = 'PASTE-OLD-PORTFOLIO-ID-HERE'::uuid;  -- Replace with old portfolio ID

-- Expected result: "INSERT 0 X" where X = number of holdings copied


-- ========================================
-- STEP 3: Transfer Transactions (Optional)
-- Replace the portfolio IDs below, then run
-- ========================================

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
  'PASTE-APARNA-PORTFOLIO-ID-HERE'::uuid as portfolio_id,  -- Replace with Aparna's portfolio ID
  symbol,
  type,
  quantity,
  price,
  date,
  NOW() as created_at
FROM public.transactions
WHERE portfolio_id = 'PASTE-OLD-PORTFOLIO-ID-HERE'::uuid;  -- Replace with old portfolio ID


-- ========================================
-- STEP 4: Verify Transfer
-- Replace Aparna's portfolio ID below
-- ========================================

-- Check holdings count
SELECT
  COUNT(*) as total_holdings,
  'Aparna Portfolio' as portfolio
FROM public.holdings
WHERE portfolio_id = 'PASTE-APARNA-PORTFOLIO-ID-HERE'::uuid;

-- View all transferred holdings
SELECT
  symbol,
  quantity,
  avg_cost,
  asset_type,
  manual_price,
  created_at
FROM public.holdings
WHERE portfolio_id = 'PASTE-APARNA-PORTFOLIO-ID-HERE'::uuid
ORDER BY created_at DESC;


-- ========================================
-- STEP 5: View in App
-- ========================================
-- 1. Open your app
-- 2. Go to Clients → Aparna Oruganti
-- 3. View her portfolio
-- 4. All holdings should be there!


-- ========================================
-- STEP 6: Clean Up Old Data (OPTIONAL - Run Later)
-- Only run after verifying transfer was successful!
-- ========================================

-- Uncomment and run these ONLY after confirming transfer worked:

-- Delete old holdings
-- DELETE FROM public.holdings
-- WHERE portfolio_id = 'PASTE-OLD-PORTFOLIO-ID-HERE'::uuid;

-- Delete old transactions
-- DELETE FROM public.transactions
-- WHERE portfolio_id = 'PASTE-OLD-PORTFOLIO-ID-HERE'::uuid;

-- Delete old portfolio
-- DELETE FROM public.portfolios
-- WHERE id = 'PASTE-OLD-PORTFOLIO-ID-HERE'::uuid;

-- Delete old client (if no longer needed)
-- DELETE FROM public.users
-- WHERE id = '8a0f0b12-887d-482f-8d6e-da86a0761202'::uuid;
