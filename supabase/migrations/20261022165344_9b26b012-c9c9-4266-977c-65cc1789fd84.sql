create or replace function public.block_loyalty_when_suspended()
returns trigger language plpgsql security definer set search_path=public as $$
declare s jsonb;
begin
  if new.entry_type = 'LOYALTY_REWARD' then
    select setting_value::jsonb into s from system_settings where setting_key='loyalty_awards';
    if coalesce((s->>'suspended')::boolean,false) or coalesce(s->>'mode','')='off' then
      return null;
    end if;
  end if;
  return new;
end $$;
revoke execute on function public.block_loyalty_when_suspended() from public, anon, authenticated;