-- Execute through the migration tool; temporary records roll back.
DO $$
DECLARE staff_id uuid; staff_email text; denied boolean; result json; before_count bigint;
  rule record; predicate text; candidate jsonb; allowed boolean;
BEGIN
  IF has_function_privilege('authenticated','public.award_approval_reward_impl(uuid,text,text)','EXECUTE') THEN
    RAISE EXCEPTION 'Staff can still bypass the approval reward guard';
  END IF;
  SELECT u.id,u.email INTO staff_id,staff_email FROM auth.users u
  JOIN public.employees e ON lower(e.email)=lower(u.email)
  WHERE lower(e.status)='active' AND coalesce(e.disabled,false)=false LIMIT 1;
  IF staff_id IS NULL THEN RAISE EXCEPTION 'Active staff required for ownership regression'; END IF;
  BEGIN
    PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',staff_id,'email',staff_email,'role','authenticated')::text,true);
    SET LOCAL ROLE authenticated;
    -- Legitimate self-entry still succeeds.
    INSERT INTO public.field_attendance_logs(field_agent,location_name) VALUES(staff_email,'Temporary security regression');
    denied:=false;
    BEGIN
      INSERT INTO public.field_attendance_logs(field_agent,location_name) VALUES('other@example.invalid','Temporary security regression');
    EXCEPTION WHEN insufficient_privilege THEN denied:=true;
    END;
    IF NOT denied THEN RAISE EXCEPTION 'Staff can impersonate another field agent'; END IF;
    FOR rule IN SELECT * FROM (VALUES
      ('field_assessments','submitted_by',staff_id::text),
      ('daily_reports','submitted_by',staff_email),
      ('edit_requests','requested_by',staff_email),
      ('deletion_requests','requested_by',staff_email),
      ('defect_library','added_by',staff_email),
      ('quality_recommendations','submitted_by',staff_email),
      ('quality_reevaluations','evaluated_by',staff_email),
      ('quality_daily_checklists','employee_email',staff_email)
    ) AS rules(table_name,owner_field,own_value)
    LOOP
      SELECT with_check INTO predicate FROM pg_policies WHERE schemaname='public'
        AND tablename=rule.table_name AND cmd='INSERT' AND roles @> ARRAY['authenticated']::name[];
      IF predicate IS NULL THEN RAISE EXCEPTION 'Missing ownership guard: %',rule.table_name; END IF;
      candidate:=jsonb_build_object(rule.owner_field,rule.own_value,'status','pending');
      EXECUTE format('SELECT %s FROM jsonb_populate_record(NULL::public.%I,$1) AS %I',predicate,rule.table_name,rule.table_name)
        INTO allowed USING candidate;
      IF allowed IS DISTINCT FROM true THEN RAISE EXCEPTION 'Own entry rejected: %',rule.table_name; END IF;
      candidate:=jsonb_set(candidate,ARRAY[rule.owner_field],to_jsonb(CASE WHEN rule.owner_field='submitted_by' AND rule.table_name='field_assessments'
        THEN '00000000-0000-0000-0000-000000000000' ELSE 'other@example.invalid' END));
      EXECUTE format('SELECT %s FROM jsonb_populate_record(NULL::public.%I,$1) AS %I',predicate,rule.table_name,rule.table_name)
        INTO allowed USING candidate;
      IF allowed IS TRUE THEN RAISE EXCEPTION 'Impersonated entry accepted: %',rule.table_name; END IF;
    END LOOP;
    IF EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sms_failures'
      AND cmd IN ('INSERT','ALL') AND roles && ARRAY['authenticated','public']::name[]) THEN
      RAISE EXCEPTION 'Staff have an insert policy for message failure records';
    END IF;
    SELECT count(*) INTO before_count FROM public.ledger_entries;
    result:=public.award_approval_reward(staff_id,'00000000-0000-0000-0000-000000000000','admin');
    IF coalesce((result->>'success')::boolean,true) THEN RAISE EXCEPTION 'Unrecorded approval awarded money'; END IF;
    IF (SELECT count(*) FROM public.ledger_entries)<>before_count THEN RAISE EXCEPTION 'Invalid approval changed ledger'; END IF;
    RESET ROLE;
    RAISE EXCEPTION USING ERRCODE='P7777',MESSAGE='rollback successful security regression';
  EXCEPTION WHEN SQLSTATE 'P7777' THEN NULL;
  END;
END $$;