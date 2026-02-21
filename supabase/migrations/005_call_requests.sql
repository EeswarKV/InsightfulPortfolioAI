-- Call scheduling between clients and fund managers

create table public.call_requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.users(id) on delete cascade,
  manager_id uuid not null references public.users(id) on delete cascade,
  preferred_datetime text not null,
  contact_method text not null check (contact_method in ('phone', 'email')),
  contact_value text not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'completed', 'cancelled')),
  notes text,
  created_at timestamptz not null default now()
);

create index idx_call_requests_client on public.call_requests(client_id);
create index idx_call_requests_manager on public.call_requests(manager_id);

alter table public.call_requests enable row level security;

create policy "Clients can read own call requests"
  on public.call_requests for select
  using (auth.uid() = client_id);

create policy "Managers can read their call requests"
  on public.call_requests for select
  using (auth.uid() = manager_id);

create policy "Managers can update their call requests"
  on public.call_requests for update
  using (auth.uid() = manager_id);
