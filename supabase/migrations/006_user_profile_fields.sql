-- ============================================================
-- Migration 006: Add profile fields to users table
-- Run this in Supabase SQL Editor
-- ============================================================

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone_number text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url text;

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);
