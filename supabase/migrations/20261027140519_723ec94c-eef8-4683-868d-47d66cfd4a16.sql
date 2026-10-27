alter table public.meal_plan_forms add column printed_at timestamptz;
update public.meal_plan_forms set printed_at = created_at where printed_at is null;

create or replace function public.mark_meal_forms_printed(p_numbers text[]) returns integer
language plpgsql security definer set search_path=public as $$
declare n integer;
begin
 if auth.uid() is null or not public.is_procurement_reviewer(auth.uid()) then raise exception 'Only Procurement may print meal forms'; end if;
 update public.meal_plan_forms set printed_at = coalesce(printed_at, now())
  where document_number = any(p_numbers) and created_by = auth.uid();
 get diagnostics n = row_count; return n;
end $$;
revoke all on function public.mark_meal_forms_printed(text[]) from public, anon;
grant execute on function public.mark_meal_forms_printed(text[]) to authenticated;

create or replace function public.guard_paper_meal_request() returns trigger language plpgsql set search_path=public as $$
begin
 if TG_OP='UPDATE' then
  if new.paper_document_number is distinct from old.paper_document_number or (old.paper_document_number is not null and (new.requested_payment_method is distinct from old.requested_payment_method or new.submitted_by is distinct from old.submitted_by or new.phone is distinct from old.phone or new.request_type is distinct from old.request_type or new.invoice_number is distinct from old.invoice_number)) then raise exception 'Paper reference, recipient number and payment choice are locked after submission'; end if;
 end if;
 if TG_OP='INSERT' and new.request_type='meal_plan' and new.submitted_by is not null and new.paper_document_number is null then
  raise exception 'A printed meal-plan document number is required';
 end if;
 if new.paper_document_number is not null then
  if TG_OP='INSERT' then
   if auth.uid() is null or not public.is_procurement_reviewer(auth.uid()) then raise exception 'Only Procurement reviewers may submit paper meal forms'; end if;
   new.paper_document_number := upper(regexp_replace(trim(new.paper_document_number),'\s+','','g'));
   if not exists (select 1 from public.meal_plan_forms f where f.document_number=new.paper_document_number) then
    raise exception 'Document number % was never issued by the system', new.paper_document_number; end if;
   if not exists (select 1 from public.meal_plan_forms f where f.document_number=new.paper_document_number and f.printed_at is not null) then
    raise exception 'Document number % was issued but never printed', new.paper_document_number; end if;
   if exists (select 1 from public.provider_submission_requests r where r.paper_document_number=new.paper_document_number) then
    raise exception 'Document number % has already been used', new.paper_document_number; end if;
   new.submitted_by := auth.uid();
   new.status := 'pending';
   new.invoice_number := new.paper_document_number;
  end if;
  if new.request_type <> 'meal_plan' or new.requested_payment_method is null or new.requested_payment_method not in ('cash','mobile_money') then raise exception 'Choose cash or mobile money for a meal plan'; end if;
  if new.amount <= 0 or trim(new.provider_name)='' or trim(new.description)='' then raise exception 'Enter recipient, meal details and a positive amount'; end if;
  if new.requested_payment_method='mobile_money' and regexp_replace(new.phone,'[^0-9]','','g') !~ '^(0[7][0-9]{8}|256[7][0-9]{8}|[7][0-9]{8})$' then raise exception 'Enter a valid Uganda mobile money number'; end if;
 end if;
 return new;
end $$;