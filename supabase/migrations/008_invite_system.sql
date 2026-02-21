-- ============================================
-- Migration 008: Client Invite System
-- ============================================
-- Enables managers to invite clients via email
-- ============================================

-- Add invite-related fields to users table
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS invite_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS invite_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES public.users(id);

-- Create index for faster invite token lookups
CREATE INDEX IF NOT EXISTS idx_users_invite_token ON public.users(invite_token);
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);
CREATE INDEX IF NOT EXISTS idx_users_invited_by ON public.users(invited_by);

-- Add comment for status field values
COMMENT ON COLUMN public.users.status IS 'User account status: pending_invite, active, suspended';

-- ============================================
-- Create invites table for tracking
-- ============================================
CREATE TABLE IF NOT EXISTS public.invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  client_email TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT,
  invite_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending',
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for invites table
CREATE INDEX IF NOT EXISTS idx_invites_manager_id ON public.invites(manager_id);
CREATE INDEX IF NOT EXISTS idx_invites_token ON public.invites(invite_token);
CREATE INDEX IF NOT EXISTS idx_invites_status ON public.invites(status);
CREATE INDEX IF NOT EXISTS idx_invites_email ON public.invites(client_email);

-- Add comment for invite status
COMMENT ON COLUMN public.invites.status IS 'Invite status: pending, accepted, expired, cancelled';

-- ============================================
-- RLS Policies for invites table
-- ============================================

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- Managers can view their own invites
CREATE POLICY "Managers can view their invites"
  ON public.invites FOR SELECT
  USING (manager_id = auth.uid());

-- Managers can create invites
CREATE POLICY "Managers can create invites"
  ON public.invites FOR INSERT
  WITH CHECK (manager_id = auth.uid());

-- Managers can update their own invites
CREATE POLICY "Managers can update their invites"
  ON public.invites FOR UPDATE
  USING (manager_id = auth.uid());

-- Anyone can view invites by token (for acceptance page)
CREATE POLICY "Anyone can view invite by token"
  ON public.invites FOR SELECT
  USING (true);

-- ============================================
-- Function to clean up expired invites
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_expired_invites()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.invites
  SET status = 'expired'
  WHERE expires_at < NOW()
    AND status = 'pending';
END;
$$;

-- ============================================
-- Function to generate invite token
-- ============================================

CREATE OR REPLACE FUNCTION generate_invite_token()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  token TEXT;
BEGIN
  -- Generate a secure random token
  token := encode(gen_random_bytes(32), 'base64');
  -- Remove characters that might cause URL issues
  token := replace(token, '/', '_');
  token := replace(token, '+', '-');
  token := replace(token, '=', '');
  RETURN token;
END;
$$;

-- ============================================
-- Initial data: Update existing users status
-- ============================================

-- Set all existing users to 'active' status
UPDATE public.users
SET status = 'active'
WHERE status IS NULL;

-- ============================================
-- Verification queries
-- ============================================

-- Check columns were added
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'users'
--   AND column_name IN ('invite_token', 'invite_expires_at', 'status', 'invited_by');

-- Check invites table exists
-- SELECT table_name FROM information_schema.tables
-- WHERE table_name = 'invites';
