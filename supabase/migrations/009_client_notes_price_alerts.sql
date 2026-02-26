-- Migration 009: Client notes and price alerts

-- Add notes column to users table (manager can store private notes about a client)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Price alerts table (user-configured thresholds for stock price notifications)
CREATE TABLE IF NOT EXISTS public.price_alerts (
  id            UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID          NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  symbol        TEXT          NOT NULL,
  alert_type    TEXT          NOT NULL CHECK (alert_type IN ('above', 'below')),
  threshold_price NUMERIC     NOT NULL,
  is_active     BOOLEAN       NOT NULL DEFAULT true,
  triggered_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own price alerts"
  ON public.price_alerts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS price_alerts_user_id_idx ON public.price_alerts (user_id);
CREATE INDEX IF NOT EXISTS price_alerts_active_idx  ON public.price_alerts (user_id, is_active);
