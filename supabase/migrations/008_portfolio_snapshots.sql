-- Create portfolio_snapshots table to track daily portfolio values
CREATE TABLE IF NOT EXISTS public.portfolio_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id uuid NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  snapshot_date date NOT NULL,
  total_value numeric(15, 2) NOT NULL,
  invested_value numeric(15, 2) NOT NULL,
  returns_amount numeric(15, 2) NOT NULL,
  returns_percent numeric(8, 4) NOT NULL,
  holdings_count integer NOT NULL DEFAULT 0,
  snapshot_data jsonb, -- Store detailed holding values for reference
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_portfolio_date
  ON public.portfolio_snapshots(portfolio_id, snapshot_date DESC);

-- Ensure one snapshot per portfolio per day
CREATE UNIQUE INDEX IF NOT EXISTS idx_portfolio_snapshots_unique_daily
  ON public.portfolio_snapshots(portfolio_id, snapshot_date);

-- RLS policies
ALTER TABLE public.portfolio_snapshots ENABLE ROW LEVEL SECURITY;

-- Managers can view snapshots for their clients' portfolios
CREATE POLICY "Managers can view client portfolio snapshots"
  ON public.portfolio_snapshots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.portfolios p
      JOIN public.users u ON p.client_id = u.id
      WHERE p.id = portfolio_snapshots.portfolio_id
        AND u.manager_id = auth.uid()
    )
  );

-- Clients can view their own portfolio snapshots
CREATE POLICY "Clients can view own portfolio snapshots"
  ON public.portfolio_snapshots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.portfolios p
      WHERE p.id = portfolio_snapshots.portfolio_id
        AND p.client_id = auth.uid()
    )
  );

-- Only backend service can insert snapshots (we'll use service role key)
-- No policy for INSERT - will be done via service role

COMMENT ON TABLE public.portfolio_snapshots IS 'Daily snapshots of portfolio values for performance tracking';
COMMENT ON COLUMN public.portfolio_snapshots.snapshot_date IS 'Date of the snapshot (typically end of trading day)';
COMMENT ON COLUMN public.portfolio_snapshots.total_value IS 'Total portfolio value at snapshot time';
COMMENT ON COLUMN public.portfolio_snapshots.invested_value IS 'Total invested amount (cost basis)';
COMMENT ON COLUMN public.portfolio_snapshots.returns_amount IS 'Total returns in currency';
COMMENT ON COLUMN public.portfolio_snapshots.returns_percent IS 'Total returns as percentage';
COMMENT ON COLUMN public.portfolio_snapshots.snapshot_data IS 'Detailed breakdown of holdings and values';
