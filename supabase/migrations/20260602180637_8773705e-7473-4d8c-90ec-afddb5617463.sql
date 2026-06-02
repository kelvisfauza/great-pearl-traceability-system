
create or replace function public.list_overdraft_applications_admin(p_email text)
returns setof public.overdraft_applications
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.employees
    where lower(email) = lower(p_email)
      and role in ('Administrator','Super Admin','Manager')
  ) then
    return;
  end if;
  return query select * from public.overdraft_applications order by created_at desc limit 200;
end;
$$;

create or replace function public.list_overdraft_accounts_admin(p_email text)
returns setof public.overdraft_accounts
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.employees
    where lower(email) = lower(p_email)
      and role in ('Administrator','Super Admin','Manager')
  ) then
    return;
  end if;
  return query select * from public.overdraft_accounts order by created_at desc limit 500;
end;
$$;

grant execute on function public.list_overdraft_applications_admin(text) to authenticated, anon;
grant execute on function public.list_overdraft_accounts_admin(text) to authenticated, anon;
