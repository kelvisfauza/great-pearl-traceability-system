create or replace function public.block_loyalty_when_suspended()
returns trigger language plpgsql security definer set search_path=public as $$
declare s jsonb;
begin
  if new.entry_type = 'LOYALTY_REWARD' then
    select value::jsonb into s from system_settings where key='loyalty_awards';
    if coalesce((s->>'suspended')::boolean,false) or coalesce(s->>'mode','')='off' then
      return null; -- silently drop
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_block_loyalty_when_suspended on public.ledger_entries;
create trigger trg_block_loyalty_when_suspended before insert on public.ledger_entries
for each row execute function public.block_loyalty_when_suspended();