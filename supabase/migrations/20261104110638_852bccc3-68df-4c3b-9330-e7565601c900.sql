create or replace function per_diem_private.submit(p_number text)
 returns public.per_diem_requests language plpgsql security definer set search_path to 'public' as $$
declare r public.per_diem_requests%rowtype; e public.employees%rowtype; n text; sd date[];
begin
 n := upper(regexp_replace(trim(coalesce(p_number,'')), '[\s_]+', '-', 'g'));
 if n = '' then raise exception 'Printed form number is required'; end if;
 select * into e from public.employees where lower(email)=lower(auth.jwt()->>'email') limit 1;
 select * into r from public.per_diem_requests
  where replace(document_number,'-','')=replace(n,'-','')
    and (created_by=auth.uid() or (e.id is not null and employee_id=e.id)) for update;
 if r.id is null then raise exception 'Form number % was not found on your account. Check the number printed on your form.', n; end if;
 if r.printed_at is null then raise exception 'The form must be prepared for printing first'; end if;
 if r.status<>'draft' then raise exception 'This form number has already been submitted'; end if;
 perform pg_advisory_xact_lock(hashtext('per_diem_sunday:'||r.employee_id::text));
 if r.form_data->>'workType'='sunday' and not (r.form_data ? 'sundayDates') then
   select * into e from public.employees where id=r.employee_id;
   sd := per_diem_private.sunday_days(e,(r.form_data->>'startDate')::date,(r.form_data->>'endDate')::date, r.id);
   if coalesce(array_length(sd,1),0)=0 then raise exception 'No unclaimed Sundays worked were found in this period'; end if;
   r.form_data := r.form_data || jsonb_build_object('days',array_length(sd,1)::text,'ratePerDay','10000','sundayDates',to_jsonb(sd::text[]));
   r.amount := array_length(sd,1)*10000 + coalesce((r.form_data->>'transport')::numeric,0)+coalesce((r.form_data->>'accommodation')::numeric,0)+coalesce((r.form_data->>'other')::numeric,0);
 end if;
 perform per_diem_private.check_sunday(r);
 update public.per_diem_requests set status='pending',submitted_at=now(),form_data=r.form_data,amount=r.amount where id=r.id returning * into r;
 return r;
end $$;

update public.per_diem_requests
 set form_data = form_data || jsonb_build_object('days','3','sundayDates',jsonb_build_array('2026-09-06','2026-09-13','2026-09-20')), amount = 30000
 where id='f212e035-1bce-44c0-8ae8-73797525c036' and status='pending';