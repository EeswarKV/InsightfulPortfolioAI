-- Add manual NAV/price tracking fields to holdings
ALTER TABLE public.holdings
  ADD COLUMN IF NOT EXISTS manual_price numeric(15,2),
  ADD COLUMN IF NOT EXISTS last_price_update timestamptz;

-- Add comment explaining the fields
COMMENT ON COLUMN public.holdings.manual_price IS 'Manually updated current price/NAV for holdings without live market data';
COMMENT ON COLUMN public.holdings.last_price_update IS 'Timestamp of last manual price update';

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_holdings_last_price_update ON public.holdings(last_price_update);
