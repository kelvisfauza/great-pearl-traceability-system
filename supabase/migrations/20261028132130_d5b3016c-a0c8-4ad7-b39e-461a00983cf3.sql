create or replace function public.set_loyalty_awards_enabled(p_enabled boolean)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v jsonb; who text;
begin
  if not public.is_current_user_admin() then raise exception 'Only administrators can change loyalty'; end if;
  select coalesce(name,email) into who from employees where auth_user_id=auth.uid() limit 1;
  v := case when p_enabled then jsonb_build_object('suspended',false,'mode','daily','silent',true)
            else jsonb_build_object('suspended',true,'mode','off','silent',true) end
       || jsonb_build_object('changed_by',who,'changed_at',now());
  update system_settings set setting_value=v, updated_at=now(), updated_by=auth.uid() where setting_key='loyalty_awards';
  if not found then insert into system_settings(setting_key,setting_value,updated_at,updated_by) values('loyalty_awards',v,now(),auth.uid()); end if;
  return v;
end $$;
revoke execute on function public.set_loyalty_awards_enabled(boolean) from public, anon;
grant execute on function public.set_loyalty_awards_enabled(boolean) to authenticated;