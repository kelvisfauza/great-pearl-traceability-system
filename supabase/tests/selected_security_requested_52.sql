-- Selected findings only. All request context and temporary writes roll back.
DO $$
DECLARE actor_id uuid; actor_email text; employee_uuid uuid; employee_code text;
 denied boolean; ledger_count bigint; result json; name text;
BEGIN
 SELECT u.id,u.email,e.id,e.employee_id INTO actor_id,actor_email,employee_uuid,employee_code
 FROM auth.users u JOIN public.employees e ON lower(e.email)=lower(u.email)
 WHERE lower(e.status)='active' AND NOT coalesce(e.disabled,false) LIMIT 1;
 IF actor_id IS NULL THEN RAISE EXCEPTION 'An active employee is required for ownership tests'; END IF;
 BEGIN
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',actor_id,'email',actor_email,'role','authenticated')::text,true);
  IF NOT public.selected_security_is_self(jsonb_build_object('employee_id',employee_uuid)) THEN RAISE EXCEPTION 'Employee identity self-review guard failed'; END IF;
  IF NOT public.selected_security_is_self(jsonb_build_object('employee_email',actor_email)) THEN RAISE EXCEPTION 'Email identity self-review guard failed'; END IF;
  IF NOT public.selected_security_is_self(jsonb_build_object('user_id',actor_id)) THEN RAISE EXCEPTION 'Wallet identity self-review guard failed'; END IF;
  IF public.selected_security_is_self(jsonb_build_object('employee_email','unrelated@example.invalid')) THEN RAISE EXCEPTION 'Independent employee wrongly blocked'; END IF;
  denied:=false;
  BEGIN
   INSERT INTO public.attendance(employee_id,employee_name,employee_email,date,status) VALUES(employee_uuid,'Security regression',actor_email,current_date,'present');
  EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'An employee can award their own attendance allowance'; END IF;
  denied:=false;
  BEGIN
   INSERT INTO public.ledger_entries(user_id,entry_type,amount,reference,metadata) VALUES(actor_id::text,'ADJUSTMENT',1,'REFUND-ABSENCE-SECURITY-REGRESSION','{"type":"absence_appeal_refund"}');
  EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'An employee can refund their own absence deduction'; END IF;
  denied:=false;
  BEGIN
   INSERT INTO public.deletion_requests(table_name,record_id,requested_by,reason,status) VALUES('employees',employee_uuid::text,actor_email,'Security regression','pending');
  EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Arbitrary deletion targets are allowed'; END IF;
  PERFORM set_config('request.jwt.claims','{}',true);
  FOREACH name IN ARRAY ARRAY['qr_access_request_otp(text,text)','qr_access_status(text,text)','qr_access_set_pin(text,text,text)','qr_access_enroll_device(text,text,text,text)'] LOOP
   IF has_function_privilege('anon','public.'||name,'EXECUTE') OR has_function_privilege('authenticated','public.'||name,'EXECUTE') THEN RAISE EXCEPTION 'Direct QR challenge access remains: %',name; END IF;
  END LOOP;
  SELECT count(*) INTO ledger_count FROM public.ledger_entries;
  result:=public.award_meeting_attendance_bonus(gen_random_uuid(),true);
  IF coalesce((result->>'success')::boolean,true) THEN RAISE EXCEPTION 'Caller interaction can issue a meeting credit'; END IF;
  result:=public.award_host_meeting_bonus(gen_random_uuid());
  IF coalesce((result->>'success')::boolean,true) THEN RAISE EXCEPTION 'Caller-edited attendance can issue a host credit'; END IF;
  result:=public.award_all_meeting_attendance_bonuses(gen_random_uuid());
  IF coalesce((result->>'success')::boolean,true) THEN RAISE EXCEPTION 'Caller-edited attendance can issue participant credits'; END IF;
  IF (SELECT count(*) FROM public.ledger_entries)<>ledger_count THEN RAISE EXCEPTION 'Unverified meeting altered wallet credits'; END IF;
  IF NOT has_table_privilege('service_role','public.external_payout_requests','INSERT') THEN RAISE EXCEPTION 'Saved external request cannot be created'; END IF;
  IF has_table_privilege('authenticated','public.external_payout_requests','INSERT') OR has_table_privilege('authenticated','public.external_payout_requests','UPDATE') THEN RAISE EXCEPTION 'Staff can bypass the external approval boundary'; END IF;
  IF has_table_privilege('anon','public.payslip_access_records','SELECT') THEN RAISE EXCEPTION 'Payslip access records are public'; END IF;
  RAISE EXCEPTION USING ERRCODE='P7777',MESSAGE='Rollback security regression context';
 EXCEPTION WHEN SQLSTATE 'P7777' THEN NULL; END;
END $$;