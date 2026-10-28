create table public.per_diem_requests (
 id uuid primary key default gen_random_uuid(), document_number text not null unique default ('PD-' || to_char(now(),'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10))),
 created_by uuid not null default auth.uid(), employee_id uuid not null, employee_email text not null, employee_name text not null,
 form_data jsonb not null, amount numeric not null, printed_at timestamptz, submitted_at timestamptz, status text not null default 'draft', award_id uuid unique,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
grant select on public.per_diem_requests to authenticated;
grant all on public.per_diem_requests to service_role;
alter table public.per_diem_requests enable row level security;
create policy per_diem_request_read on public.per_diem_requests for select to authenticated using (created_by=auth.uid() or public.can_manage_employees());
create function public.per_diem_request_touch() returns trigger language plpgsql set search_path=public as $$ begin new.updated_at=now(); return new; end $$;
create trigger per_diem_request_touch before update on public.per_diem_requests for each row execute function public.per_diem_request_touch();
create schema if not exists per_diem_private;
revoke all on schema per_diem_private from public,anon;
grant usage on schema per_diem_private to authenticated,service_role;
create function per_diem_private.issue(p_data jsonb) returns public.per_diem_requests language plpgsql security definer set search_path=public as $$
declare e public.employees%rowtype; r public.per_diem_requests%rowtype; total numeric;
begin
 select * into e from public.employees where lower(email)=lower(auth.jwt()->>'email') and disabled is not true limit 1;
 if auth.uid() is null or e.id is null then raise exception 'An active employee account is required'; end if;
 if nullif(trim(p_data->>'destination'),'') is null or nullif(trim(p_data->>'purpose'),'') is null then raise exception 'Destination and purpose are required'; end if;
 total := (p_data->>'days')::numeric*(p_data->>'ratePerDay')::numeric + coalesce((p_data->>'transport')::numeric,0)+coalesce((p_data->>'accommodation')::numeric,0)+coalesce((p_data->>'other')::numeric,0);
 if total is null or total<=0 or (p_data->>'days')::numeric<=0 or (p_data->>'ratePerDay')::numeric<0 or coalesce((p_data->>'transport')::numeric,0)<0 or coalesce((p_data->>'accommodation')::numeric,0)<0 or coalesce((p_data->>'other')::numeric,0)<0 then raise exception 'Enter valid positive per diem costs'; end if;
 insert into public.per_diem_requests(employee_id,employee_email,employee_name,form_data,amount) values(e.id,e.email,e.name,p_data,total) returning * into r;
 return r;
end $$;
create function per_diem_private.mark_printed(p_id uuid) returns void language plpgsql security definer set search_path=public as $$ begin
 update public.per_diem_requests set printed_at=coalesce(printed_at,now()) where id=p_id and created_by=auth.uid() and status='draft';
 if not found then raise exception 'Your issued draft form was not found'; end if;
end $$;
create function per_diem_private.submit(p_number text) returns public.per_diem_requests language plpgsql security definer set search_path=public as $$
declare r public.per_diem_requests%rowtype;
begin
 if nullif(trim(p_number),'') is null then raise exception 'Printed form number is required'; end if;
 select * into r from public.per_diem_requests where document_number=upper(trim(p_number)) and created_by=auth.uid() for update;
 if r.id is null then raise exception 'Enter your issued per diem form number'; end if;
 if r.printed_at is null then raise exception 'The form must be prepared for printing first'; end if;
 if r.status<>'draft' then raise exception 'This form number has already been submitted'; end if;
 update public.per_diem_requests set status='pending',submitted_at=now() where id=r.id returning * into r;
 return r;
end $$;
create function per_diem_private.award(p_id uuid) returns public.per_diem_requests language plpgsql security definer set search_path=public as $$
declare r public.per_diem_requests%rowtype; aid uuid; actor text; uid text;
begin
 if auth.uid() is null or not public.can_manage_employees() then raise exception 'Only Admin or HR may award per diem'; end if;
 select * into r from public.per_diem_requests where id=p_id for update;
 if r.id is null or r.status<>'pending' or r.printed_at is null then raise exception 'Select a submitted printed per diem request that has not been awarded'; end if;
 if not exists(select 1 from public.employees where id=r.employee_id and disabled is not true) then raise exception 'Employee account is disabled'; end if;
 select name into actor from public.employees where lower(email)=lower(auth.jwt()->>'email') limit 1;
 actor:=coalesce(actor,auth.jwt()->>'email'); uid:=public.get_unified_user_id(r.employee_email);
 insert into public.per_diem_awards(employee_id,employee_email,employee_name,amount,reason,awarded_by) values(r.employee_id::text,r.employee_email,r.employee_name,r.amount,(r.form_data->>'purpose') || ' (Ref: ' || r.document_number || ')',actor) returning id into aid;
 insert into public.ledger_entries(user_id,entry_type,amount,reference,source_category,metadata) values(uid,'DEPOSIT',r.amount,r.document_number,'PER_DIEM',jsonb_build_object('type','per_diem','reason',r.form_data->>'purpose','work_type',r.form_data->>'workType','ref_number',r.document_number,'request_id',r.id,'awarded_by',actor,'employee_name',r.employee_name));
 update public.per_diem_requests set status='awarded',award_id=aid where id=r.id returning * into r;
 return r;
end $$;
revoke all on all functions in schema per_diem_private from public,anon;
grant execute on all functions in schema per_diem_private to authenticated,service_role;
create function public.issue_per_diem_form(p_data jsonb) returns public.per_diem_requests language sql security invoker set search_path=public as $$ select per_diem_private.issue(p_data); $$;
create function public.mark_per_diem_form_printed(p_id uuid) returns void language sql security invoker set search_path=public as $$ select per_diem_private.mark_printed(p_id); $$;
create function public.submit_per_diem_form(p_number text) returns public.per_diem_requests language sql security invoker set search_path=public as $$ select per_diem_private.submit(p_number); $$;
create function public.award_per_diem_request(p_id uuid) returns public.per_diem_requests language sql security invoker set search_path=public as $$ select per_diem_private.award(p_id); $$;
revoke all on function public.issue_per_diem_form(jsonb),public.mark_per_diem_form_printed(uuid),public.submit_per_diem_form(text),public.award_per_diem_request(uuid) from public,anon;
grant execute on function public.issue_per_diem_form(jsonb),public.mark_per_diem_form_printed(uuid),public.submit_per_diem_form(text),public.award_per_diem_request(uuid) to authenticated,service_role;