-- ============================================================
-- Migration 004: Fix infinite recursion in users RLS policies
-- Run this in Supabase SQL Editor
-- ============================================================
-- Problem: Policies on public.users that do
--   "select from public.users" cause infinite recursion.
-- Fix: Create a SECURITY DEFINER function (bypasses RLS)
--   to check the current user's role, then use it in policies.
-- ============================================================

-- 1. Create helper function (bypasses RLS)
create or replace function public.is_manager()
returns boolean as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'manager'
  );
$$ language sql security definer stable;

-- 2. Drop the recursive policies
drop policy if exists "Managers can read unassigned clients by email" on public.users;
drop policy if exists "Managers can claim unassigned clients" on public.users;

-- 3. Recreate them using is_manager() instead of subquery
create policy "Managers can read unassigned clients by email"
  on public.users for select
  using (
    role = 'client'
    and manager_id is null
    and public.is_manager()
  );

create policy "Managers can claim unassigned clients"
  on public.users for update
  using (
    role = 'client'
    and manager_id is null
    and public.is_manager()
  )
  with check (
    role = 'client'
    and manager_id = auth.uid()
  );
