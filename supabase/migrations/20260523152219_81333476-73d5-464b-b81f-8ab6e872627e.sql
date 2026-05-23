create table if not exists public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  token text not null,
  platform text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(user_id, token)
);

create index if not exists idx_device_tokens_user_id on public.device_tokens(user_id);

alter table public.device_tokens enable row level security;

drop policy if exists "Users manage own device tokens" on public.device_tokens;
create policy "Users manage own device tokens"
on public.device_tokens
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);