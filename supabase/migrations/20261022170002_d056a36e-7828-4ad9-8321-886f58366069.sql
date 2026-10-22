create or replace function public.update_own_bank_details(_bank_name text, _account_name text, _account_number text)
returns jsonb language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if coalesce(trim(_bank_name),'')='' or coalesce(trim(_account_name),'')='' or length(regexp_replace(coalesce(_account_number,''),'\D','','g'))<6 then
    return jsonb_build_object('success',false,'error','Please enter bank name, account name and a valid account number');
  end if;
  update employees set bank_name=trim(_bank_name), account_name=trim(_account_name), account_number=trim(_account_number), updated_at=now()
  where auth_user_id=auth.uid();
  if not found then return jsonb_build_object('success',false,'error','Employee record not found'); end if;
  return jsonb_build_object('success',true);
end $$;
revoke execute on function public.update_own_bank_details(text,text,text) from public, anon;
grant execute on function public.update_own_bank_details(text,text,text) to authenticated;