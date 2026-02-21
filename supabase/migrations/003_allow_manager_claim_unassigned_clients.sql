-- ============================================================
-- Migration 003: Allow managers to claim unassigned clients
-- Run this in Supabase SQL Editor after 002
-- ============================================================
-- Problem: The existing "Managers can update their clients" policy
-- uses (auth.uid() = manager_id), which only works AFTER a client
-- is already linked. This policy allows the initial claim.
-- ============================================================

create policy "Managers can claim unassigned clients"
  on public.users for update
  using (
    role = 'client'
    and manager_id is null
    and exists (
      select 1 from public.users as u
      where u.id = auth.uid() and u.role = 'manager'
    )
  )
  with check (
    role = 'client'
    and manager_id = auth.uid()
  );
