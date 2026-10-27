create sequence public.meal_plan_form_seq;
create table public.meal_plan_forms (
 id uuid primary key default gen_random_uuid(),
 document_number text not null unique default ('MP-' || to_char(now() at time zone 'Africa/Kampala','YYYY') || '-' || lpad(nextval('public.meal_plan_form_seq')::text,6,'0')),
 created_by uuid not null default auth.uid(),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
grant select,insert on public.meal_plan_forms to authenticated;
grant all on public.meal_plan_forms to service_role;
grant usage on sequence public.meal_plan_form_seq to authenticated,service_role;
alter table public.meal_plan_forms enable row level security;
create policy "Procurement reads meal forms" on public.meal_plan_forms for select to authenticated using (public.is_procurement_reviewer(auth.uid()));
create policy "Procurement issues meal forms" on public.meal_plan_forms for insert to authenticated with check (public.is_procurement_reviewer(auth.uid()) and created_by=auth.uid());
create trigger meal_forms_updated before update on public.meal_plan_forms for each row execute function public.update_updated_at_column();
alter table public.provider_submission_requests add column paper_document_number text references public.meal_plan_forms(document_number), add column requested_payment_method text, add column submitted_by uuid;
create unique index provider_paper_document_once on public.provider_submission_requests(paper_document_number) where paper_document_number is not null;
create function public.guard_paper_meal_request() returns trigger language plpgsql set search_path=public as $$
begin
 if TG_OP='UPDATE' then
  if new.paper_document_number is distinct from old.paper_document_number or (old.paper_document_number is not null and (new.requested_payment_method is distinct from old.requested_payment_method or new.submitted_by is distinct from old.submitted_by or new.phone is distinct from old.phone or new.request_type is distinct from old.request_type or new.invoice_number is distinct from old.invoice_number)) then raise exception 'Paper reference, recipient number and payment choice are locked after submission'; end if;
 end if;
 if new.paper_document_number is not null then
  if TG_OP='INSERT' then
   if auth.uid() is null or not public.is_procurement_reviewer(auth.uid()) then raise exception 'Only Procurement reviewers may submit paper meal forms'; end if;
   new.paper_document_number := upper(trim(new.paper_document_number));
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
create trigger guard_paper_meal_request before insert or update on public.provider_submission_requests for each row execute function public.guard_paper_meal_request();