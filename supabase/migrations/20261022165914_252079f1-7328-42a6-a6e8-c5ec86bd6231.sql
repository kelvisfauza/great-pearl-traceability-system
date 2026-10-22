create or replace function public.drop_free_service_fees()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.entry_type='WITHDRAWAL' and coalesce(new.metadata::jsonb->>'source','') in ('balance_check_fee','statement_fee') then
    return null;
  end if;
  return new;
end $$;
revoke execute on function public.drop_free_service_fees() from public, anon, authenticated;
drop trigger if exists trg_drop_free_service_fees on public.ledger_entries;
create trigger trg_drop_free_service_fees before insert on public.ledger_entries for each row execute function public.drop_free_service_fees();

create or replace function public.zero_balance_check_fee()
returns trigger language plpgsql set search_path=public as $$
begin new.fee_charged := 0; return new; end $$;
revoke execute on function public.zero_balance_check_fee() from public, anon, authenticated;
drop trigger if exists trg_zero_balance_check_fee on public.balance_check_log;
create trigger trg_zero_balance_check_fee before insert on public.balance_check_log for each row execute function public.zero_balance_check_fee();