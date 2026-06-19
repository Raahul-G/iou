-- Push notification tokens table
create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  token text not null,
  platform text not null check (platform in ('ios', 'android')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, token)
);

-- Index for fast lookup by user
create index if not exists idx_push_tokens_user_id on public.push_tokens(user_id);

-- RLS
alter table public.push_tokens enable row level security;

create policy "Users can read own tokens"
  on public.push_tokens for select
  using (auth.uid() = user_id);

create policy "Users can insert own tokens"
  on public.push_tokens for insert
  with check (auth.uid() = user_id);

create policy "Users can update own tokens"
  on public.push_tokens for update
  using (auth.uid() = user_id);

create policy "Users can delete own tokens"
  on public.push_tokens for delete
  using (auth.uid() = user_id);
