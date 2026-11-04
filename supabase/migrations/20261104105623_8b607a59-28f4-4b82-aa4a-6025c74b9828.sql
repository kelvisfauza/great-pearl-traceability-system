create or replace function per_diem_private.sunday_days(p_emp public.employees, p_from date, p_to date, p_exclude uuid default null)
returns date[] language sql stable security definer set search_path to 'public' as $$
 select coalesce(array_agg(d order by d), '{}') from (
  select distinct t.record_date d from public.attendance_time_records t
  where (t.employee_id = p_emp.id::text or lower(t.employee_email)=lower(p_emp.email))
    and t.record_date between p_from and p_to and extract(dow from t.record_date)=0
    and lower(coalesce(t.status,''))='present'
    and not exists (select 1 from public.per_diem_requests r
      where r.employee_id=p_emp.id and r.status in ('pending','awarded') and r.id is distinct from p_exclude
        and r.form_data ? 'sundayDates' and (r.form_data->'sundayDates') ? t.record_date::text)
 ) x $$;

create or replace function public.my_unclaimed_sunday_days(p_from date, p_to date)
returns date[] language plpgsql stable security definer set search_path to 'public' as $$
declare e public.employees%rowtype;
begin
 select * into e from public.employees where lower(email)=lower(auth.jwt()->>'email') and disabled is not true limit 1;
 if e.id is null then raise exception 'An active employee account is required'; end if;
 return per_diem_private.sunday_days(e, p_from, p_to);
end $$;
revoke all on function public.my_unclaimed_sunday_days(date,date) from public, anon;
grant execute on function public.my_unclaimed_sunday_days(date,date) to authenticated;

create or replace function per_diem_private.check_sunday(r public.per_diem_requests)
returns void language plpgsql security definer set search_path to 'public' as $$
declare taken text;
begin
 if r.form_data->>'workType' <> 'sunday' then return; end if;
 select string_agg(distinct d, ', ') into taken from public.per_diem_requests o, jsonb_array_elements_text(r.form_data->'sundayDates') d
  where o.employee_id=r.employee_id and o.id<>r.id and o.status in ('pending','awarded') and (o.form_data->'sundayDates') ? d;
 if taken is not null then raise exception 'These Sundays were already claimed: %', taken; end if;
end $$;

create or replace function per_diem_private.issue(p_data jsonb)
 RETURNS per_diem_requests LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare e public.employees%rowtype; r public.per_diem_requests%rowtype; total numeric; sd date[];
begin
 select * into e from public.employees where lower(email)=lower(auth.jwt()->>'email') and disabled is not true limit 1;
 if auth.uid() is null or e.id is null then raise exception 'An active employee account is required'; end if;
 if nullif(trim(p_data->>'destination'),'') is null or nullif(trim(p_data->>'purpose'),'') is null then raise exception 'Destination and purpose are required'; end if;
 if p_data->>'workType'='sunday' then
   sd := per_diem_private.sunday_days(e, (p_data->>'startDate')::date, (p_data->>'endDate')::date);
   if coalesce(array_length(sd,1),0)=0 then raise exception 'No unclaimed Sundays worked were found in this period'; end if;
   p_data := p_data || jsonb_build_object('days', array_length(sd,1)::text, 'ratePerDay','10000', 'sundayDates', to_jsonb(sd::text[]));
 end if;
 total := (p_data->>'days')::numeric*(p_data->>'ratePerDay')::numeric + coalesce((p_data->>'transport')::numeric,0)+coalesce((p_data->>'accommodation')::numeric,0)+coalesce((p_data->>'other')::numeric,0);
 if total is null or total<=0 or (p_data->>'days')::numeric<=0 or (p_data->>'ratePerDay')::numeric<0 or coalesce((p_data->>'transport')::numeric,0)<0 or coalesce((p_data->>'accommodation')::numeric,0)<0 or coalesce((p_data->>'other')::numeric,0)<0 then raise exception 'Enter valid positive per diem costs'; end if;
 insert into public.per_diem_requests(employee_id,employee_email,employee_name,form_data,amount) values(e.id,e.email,e.name,p_data,total) returning * into r;
 return r;
end $function$;

create or replace function per_diem_private.submit(p_number text)
 RETURNS per_diem_requests LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare r public.per_diem_requests%rowtype;
begin
 if nullif(trim(p_number),'') is null then raise exception 'Printed form number is required'; end if;
 select * into r from public.per_diem_requests where document_number=upper(trim(p_number)) and created_by=auth.uid() for update;
 if r.id is null then raise exception 'Enter your issued per diem form number'; end if;
 if r.printed_at is null then raise exception 'The form must be prepared for printing first'; end if;
 if r.status<>'draft' then raise exception 'This form number has already been submitted'; end if;
 perform pg_advisory_xact_lock(hashtext('per_diem_sunday:'||r.employee_id::text));
 perform per_diem_private.check_sunday(r);
 update public.per_diem_requests set status='pending',submitted_at=now() where id=r.id returning * into r;
 return r;
end $function$;

create or replace function per_diem_private.award(p_id uuid)
 RETURNS per_diem_requests LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare r public.per_diem_requests%rowtype; aid uuid; actor text; uid text;
begin
 if auth.uid() is null or not public.can_manage_employees() then raise exception 'Only Admin or HR may award per diem'; end if;
 select * into r from public.per_diem_requests where id=p_id for update;
 if r.id is null or r.status<>'pending' or r.printed_at is null then raise exception 'Select a submitted printed per diem request that has not been awarded'; end if;
 perform pg_advisory_xact_lock(hashtext('per_diem_sunday:'||r.employee_id::text));
 perform per_diem_private.check_sunday(r);
 if not exists(select 1 from public.employees where id=r.employee_id and disabled is not true) then raise exception 'Employee account is disabled'; end if;
 select name into actor from public.employees where lower(email)=lower(auth.jwt()->>'email') limit 1;
 actor:=coalesce(actor,auth.jwt()->>'email'); uid:=public.get_unified_user_id(r.employee_email);
 insert into public.per_diem_awards(employee_id,employee_email,employee_name,amount,reason,awarded_by) values(r.employee_id::text,r.employee_email,r.employee_name,r.amount,(r.form_data->>'purpose') || ' (Ref: ' || r.document_number || ')',actor) returning id into aid;
 insert into public.ledger_entries(user_id,entry_type,amount,reference,source_category,metadata) values(uid,'DEPOSIT',r.amount,r.document_number,'PER_DIEM',jsonb_build_object('type','per_diem','reason',r.form_data->>'purpose','work_type',r.form_data->>'workType','ref_number',r.document_number,'request_id',r.id,'awarded_by',actor,'employee_name',r.employee_name,'sunday_dates',r.form_data->'sundayDates'));
 update public.per_diem_requests set status='awarded',award_id=aid where id=r.id returning * into r;
 return r;
end $function$;