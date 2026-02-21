-- ============================================================
-- PortfolioAI - Initial Database Schema
-- Run this in the Supabase SQL Editor after creating your project
-- ============================================================

-- Enable pgvector extension (for future RAG / embeddings)
create extension if not exists vector;

-- ============================================================
-- USERS (extends Supabase auth.users)
-- ============================================================
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  role text not null check (role in ('manager', 'client')),
  manager_id uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_users_manager_id on public.users(manager_id);

-- ============================================================
-- PORTFOLIOS
-- ============================================================
create table public.portfolios (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_portfolios_client_id on public.portfolios(client_id);

-- ============================================================
-- HOLDINGS
-- ============================================================
create table public.holdings (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  symbol text not null,
  quantity numeric not null default 0,
  avg_cost numeric not null default 0,
  asset_type text not null check (asset_type in ('stock', 'etf', 'mutual_fund', 'bond', 'crypto')),
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_holdings_portfolio_id on public.holdings(portfolio_id);

-- ============================================================
-- TRANSACTIONS
-- ============================================================
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  symbol text not null,
  type text not null check (type in ('buy', 'sell', 'dividend')),
  quantity numeric not null,
  price numeric not null,
  date timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index idx_transactions_portfolio_id on public.transactions(portfolio_id);

-- ============================================================
-- DOCUMENTS (Phase 3 stub)
-- ============================================================
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  manager_id uuid not null references public.users(id) on delete cascade,
  filename text not null,
  storage_url text not null,
  uploaded_at timestamptz not null default now(),
  status text not null default 'processing' check (status in ('processing', 'ready', 'failed'))
);

-- ============================================================
-- DOCUMENT_CHUNKS (Phase 3 stub)
-- ============================================================
create table public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  chunk_text text not null,
  embedding_vector vector(1536),
  metadata jsonb default '{}'
);

-- ============================================================
-- CONVERSATIONS (Phase 2 stub)
-- ============================================================
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ============================================================
-- MESSAGES (Phase 2 stub)
-- ============================================================
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  sources jsonb default '[]',
  created_at timestamptz not null default now()
);

-- ============================================================
-- ALERTS
-- ============================================================
create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_alerts_user_id on public.alerts(user_id);

-- ============================================================
-- TRIGGER: Auto-create public.users row on signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'client')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- TRIGGER: Auto-update updated_at timestamps
-- ============================================================
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at before update on public.users
  for each row execute function public.update_updated_at();
create trigger set_updated_at before update on public.portfolios
  for each row execute function public.update_updated_at();
create trigger set_updated_at before update on public.holdings
  for each row execute function public.update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.users enable row level security;
alter table public.portfolios enable row level security;
alter table public.holdings enable row level security;
alter table public.transactions enable row level security;
alter table public.alerts enable row level security;
alter table public.documents enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- USERS policies
create policy "Users can read own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Managers can read their clients"
  on public.users for select
  using (auth.uid() = manager_id);

create policy "Managers can update their clients"
  on public.users for update
  using (auth.uid() = manager_id);

-- PORTFOLIOS policies
create policy "Clients can read own portfolios"
  on public.portfolios for select
  using (auth.uid() = client_id);

create policy "Managers can read client portfolios"
  on public.portfolios for select
  using (
    exists (
      select 1 from public.users
      where users.id = portfolios.client_id
        and users.manager_id = auth.uid()
    )
  );

create policy "Managers can create portfolios for clients"
  on public.portfolios for insert
  with check (
    exists (
      select 1 from public.users
      where users.id = portfolios.client_id
        and users.manager_id = auth.uid()
    )
  );

-- HOLDINGS policies
create policy "Users can read holdings of accessible portfolios"
  on public.holdings for select
  using (
    exists (
      select 1 from public.portfolios
      where portfolios.id = holdings.portfolio_id
        and (
          portfolios.client_id = auth.uid()
          or exists (
            select 1 from public.users
            where users.id = portfolios.client_id
              and users.manager_id = auth.uid()
          )
        )
    )
  );

-- TRANSACTIONS policies
create policy "Users can read transactions of accessible portfolios"
  on public.transactions for select
  using (
    exists (
      select 1 from public.portfolios
      where portfolios.id = transactions.portfolio_id
        and (
          portfolios.client_id = auth.uid()
          or exists (
            select 1 from public.users
            where users.id = portfolios.client_id
              and users.manager_id = auth.uid()
          )
        )
    )
  );

-- ALERTS policies
create policy "Users can read own alerts"
  on public.alerts for select
  using (auth.uid() = user_id);

create policy "Users can update own alerts"
  on public.alerts for update
  using (auth.uid() = user_id);

-- DOCUMENTS policies
create policy "Managers can read own documents"
  on public.documents for select
  using (auth.uid() = manager_id);

create policy "Managers can insert own documents"
  on public.documents for insert
  with check (auth.uid() = manager_id);

-- CONVERSATIONS policies
create policy "Clients can read own conversations"
  on public.conversations for select
  using (auth.uid() = client_id);

-- MESSAGES policies
create policy "Users can read messages of accessible conversations"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations
      where conversations.id = messages.conversation_id
        and conversations.client_id = auth.uid()
    )
  );
