-- Excel (OneDrive) data-entry loyalty tracking
create table if not exists public.excel_loyalty_rows (
  id uuid primary key default gen_random_uuid(),
  file_id text not null,
  file_name text not null,
  sheet_name text not null,
  row_key text not null,
  row_preview text,
  matched_by text,
  awarded_user_id text,
  awarded_employee_id uuid,
  awarded_name text,
  amount numeric not null default 0,
  awarded boolean not null default false,
  skip_reason text,
  created_at timestamptz not null default now(),
  unique (file_id, sheet_name, row_key)
);

create index if not exists idx_excel_loyalty_rows_created on public.excel_loyalty_rows(created_at desc);
create index if not exists idx_excel_loyalty_rows_emp on public.excel_loyalty_rows(awarded_employee_id);

create table if not exists public.excel_loyalty_scans (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running',
  files_scanned integer not null default 0,
  rows_seen integer not null default 0,
  rows_new integer not null default 0,
  rows_awarded integer not null default 0,
  amount_total numeric not null default 0,
  error text,
  details jsonb not null default '{}'::jsonb
);

create index if not exists idx_excel_loyalty_scans_started on public.excel_loyalty_scans(started_at desc);

grant select on public.excel_loyalty_rows to authenticated;
grant all on public.excel_loyalty_rows to service_role;
grant select on public.excel_loyalty_scans to authenticated;
grant all on public.excel_loyalty_scans to service_role;

alter table public.excel_loyalty_rows enable row level security;
alter table public.excel_loyalty_scans enable row level security;

drop policy if exists "Authenticated can view excel loyalty rows" on public.excel_loyalty_rows;
create policy "Authenticated can view excel loyalty rows"
  on public.excel_loyalty_rows for select to authenticated using (true);

drop policy if exists "Service role manages excel loyalty rows" on public.excel_loyalty_rows;
create policy "Service role manages excel loyalty rows"
  on public.excel_loyalty_rows for all to service_role using (true) with check (true);

drop policy if exists "Authenticated can view excel loyalty scans" on public.excel_loyalty_scans;
create policy "Authenticated can view excel loyalty scans"
  on public.excel_loyalty_scans for select to authenticated using (true);

drop policy if exists "Service role manages excel loyalty scans" on public.excel_loyalty_scans;
create policy "Service role manages excel loyalty scans"
  on public.excel_loyalty_scans for all to service_role using (true) with check (true);

insert into public.system_settings (setting_key, setting_value)
values ('excel_loyalty', jsonb_build_object(
  'enabled', false,
  'folder_path', '',
  'amount_per_row', 1000,
  'daily_cap_per_user', 20000
))
on conflict (setting_key) do nothing;