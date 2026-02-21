-- Add purchase_date field to holdings table
ALTER TABLE public.holdings ADD COLUMN IF NOT EXISTS purchase_date date DEFAULT CURRENT_DATE;

-- Update existing holdings to have purchase_date set to their created_at date
UPDATE public.holdings
SET purchase_date = created_at::date
WHERE purchase_date IS NULL;

-- Add comment explaining the field
COMMENT ON COLUMN public.holdings.purchase_date IS 'Date when the holding was acquired/purchased';
