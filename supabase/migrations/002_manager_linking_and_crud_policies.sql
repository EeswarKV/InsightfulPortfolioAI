-- ============================================================
-- Migration 002: Manager-client linking + CRUD RLS policies
-- Run this in Supabase SQL Editor after 001_initial_schema.sql
-- ============================================================

-- ============================================================
-- 1. Update handle_new_user() to support manager_id from signup
-- ============================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, full_name, role, manager_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'client'),
    case
      when new.raw_user_meta_data->>'manager_id' is not null
        and new.raw_user_meta_data->>'manager_id' != ''
      then (new.raw_user_meta_data->>'manager_id')::uuid
      else null
    end
  );
  return new;
end;
$$ language plpgsql security definer;

-- ============================================================
-- 2. Allow managers to find unassigned clients (for linking)
-- ============================================================

create policy "Managers can read unassigned clients by email"
  on public.users for select
  using (
    role = 'client'
    and manager_id is null
    and exists (
      select 1 from public.users as u
      where u.id = auth.uid() and u.role = 'manager'
    )
  );

-- ============================================================
-- 3. Holdings: INSERT / UPDATE / DELETE for managers
-- ============================================================

create policy "Managers can insert holdings for client portfolios"
  on public.holdings for insert
  with check (
    exists (
      select 1 from public.portfolios
      join public.users on users.id = portfolios.client_id
      where portfolios.id = holdings.portfolio_id
        and users.manager_id = auth.uid()
    )
  );

create policy "Managers can update holdings of client portfolios"
  on public.holdings for update
  using (
    exists (
      select 1 from public.portfolios
      join public.users on users.id = portfolios.client_id
      where portfolios.id = holdings.portfolio_id
        and users.manager_id = auth.uid()
    )
  );

create policy "Managers can delete holdings of client portfolios"
  on public.holdings for delete
  using (
    exists (
      select 1 from public.portfolios
      join public.users on users.id = portfolios.client_id
      where portfolios.id = holdings.portfolio_id
        and users.manager_id = auth.uid()
    )
  );

-- ============================================================
-- 4. Transactions: INSERT for managers
-- ============================================================

create policy "Managers can insert transactions for client portfolios"
  on public.transactions for insert
  with check (
    exists (
      select 1 from public.portfolios
      join public.users on users.id = portfolios.client_id
      where portfolios.id = transactions.portfolio_id
        and users.manager_id = auth.uid()
    )
  );

-- ============================================================
-- 5. Portfolios: UPDATE / DELETE for managers
-- ============================================================

create policy "Managers can update client portfolios"
  on public.portfolios for update
  using (
    exists (
      select 1 from public.users
      where users.id = portfolios.client_id
        and users.manager_id = auth.uid()
    )
  );

create policy "Managers can delete client portfolios"
  on public.portfolios for delete
  using (
    exists (
      select 1 from public.users
      where users.id = portfolios.client_id
        and users.manager_id = auth.uid()
    )
  );
