CREATE TABLE public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  token text not null,
  platform text not null,  -- 'ios' | 'android'
  updated_at timestamptz not null default now(),
  UNIQUE(user_id, token)
);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own tokens" ON public.push_tokens
  FOR ALL USING (auth.uid() = user_id);
