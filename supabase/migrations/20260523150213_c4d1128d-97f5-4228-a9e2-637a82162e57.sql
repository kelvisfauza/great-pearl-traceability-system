
create table if not exists public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  token text not null,
  platform text not null check (platform in ('ios','android','web')),
  app text default 'flutter',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, token)
);

create index if not exists idx_device_tokens_user on public.device_tokens(user_id);

alter table public.device_tokens enable row level security;

create policy "device_tokens_select_own" on public.device_tokens
  for select to authenticated using (user_id = auth.uid());

create policy "device_tokens_insert_own" on public.device_tokens
  for insert to authenticated with check (user_id = auth.uid());

create policy "device_tokens_update_own" on public.device_tokens
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "device_tokens_delete_own" on public.device_tokens
  for delete to authenticated using (user_id = auth.uid());

create or replace function public.touch_device_tokens_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists trg_device_tokens_updated_at on public.device_tokens;
create trigger trg_device_tokens_updated_at
before update on public.device_tokens
for each row execute function public.touch_device_tokens_updated_at();
