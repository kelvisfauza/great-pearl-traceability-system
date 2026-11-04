create or replace function per_diem_private.sunday_days(p_emp public.employees, p_from date, p_to date, p_exclude uuid default null)
returns date[] language sql stable security definer set search_path to 'public' as $$
 select coalesce(array_agg(d order by d), '{}') from (
  select distinct t.record_date d from public.attendance_time_records t
  where (t.employee_id in (p_emp.id::text, 'company_'||p_emp.id::text) or lower(t.employee_email)=lower(p_emp.email))
    and t.record_date between greatest(p_from, date '2026-09-01') and p_to and extract(dow from t.record_date)=0
    and lower(coalesce(t.status,''))='present'
    and not exists (select 1 from public.per_diem_requests r
      where r.employee_id=p_emp.id and r.status in ('pending','awarded') and r.id is distinct from p_exclude
        and r.form_data ? 'sundayDates' and (r.form_data->'sundayDates') ? t.record_date::text)
 ) x $$;