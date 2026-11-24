-- Read-only boundary checks with request identities scoped to this transaction.
DO $$
DECLARE table_name text; policy record; allowed boolean; actor_id uuid; actor_email text;
  own_name text; expression text; candidate jsonb; result json;
BEGIN
  IF has_function_privilege('anon','public.selected_staff_module_access(text[])','EXECUTE') THEN
    RAISE EXCEPTION 'Anonymous users can query staff permissions';
  END IF;
  IF EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='selected_staff_module_access' AND p.prosecdef) THEN
    RAISE EXCEPTION 'Staff module checks still use elevated privileges';
  END IF;
  IF has_function_privilege('authenticated','public.award_activity_reward_impl(uuid,text,jsonb)','EXECUTE') THEN
    RAISE EXCEPTION 'Staff can bypass the activity reward wrapper';
  END IF;
  BEGIN
    PERFORM set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000001","email":"nonstaff@example.invalid","role":"authenticated"}',true);
    SET LOCAL ROLE authenticated;
    FOREACH table_name IN ARRAY ARRAY['eudr_batch_sales','eudr_documents','eudr_sales','eudr_batches','vehicle_trips','vehicles','price_forecasts','defect_library','public_holidays','v3_quality_standards','v3_coffee_types'] LOOP
      FOR policy IN SELECT qual FROM pg_policies WHERE schemaname='public' AND tablename=table_name
        AND cmd IN ('SELECT','ALL') AND roles && ARRAY['authenticated','public']::name[] LOOP
        EXECUTE 'SELECT coalesce(('||policy.qual||'),false)' INTO allowed;
        IF allowed THEN RAISE EXCEPTION 'Nonstaff readers still reach %',table_name; END IF;
      END LOOP;
    END LOOP;
    FOREACH table_name IN ARRAY ARRAY['reports','delivery_routes','quality_performance_tracking'] LOOP
      FOR policy IN SELECT coalesce(with_check,qual) AS predicate FROM pg_policies WHERE schemaname='public' AND tablename=table_name
        AND cmd IN ('INSERT','ALL') AND roles && ARRAY['authenticated','public']::name[] LOOP
        EXECUTE 'SELECT coalesce(('||policy.predicate||'),false)' INTO allowed;
        IF allowed THEN RAISE EXCEPTION 'Nonstaff writers still reach %',table_name; END IF;
      END LOOP;
    END LOOP;
    RESET ROLE;
    SELECT u.id,u.email,e.name INTO actor_id,actor_email,own_name FROM auth.users u
      JOIN public.employees e ON lower(e.email)=lower(u.email)
      JOIN public.user_roles r ON r.user_id=u.id AND replace(lower(r.role),' ','_') IN ('admin','administrator','super_admin')
      WHERE lower(e.status)='active' AND coalesce(e.disabled,false)=false LIMIT 1;
    IF actor_id IS NULL THEN RAISE EXCEPTION 'Protected active administrator required for success check'; END IF;
    PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',actor_id,'email',actor_email,'role','authenticated')::text,true);
    SET LOCAL ROLE authenticated;
    IF NOT public.selected_staff_module_access(ARRAY['Logistics']) THEN RAISE EXCEPTION 'Protected admin lost module access'; END IF;
    FOREACH table_name IN ARRAY ARRAY['store_reports','rejected_coffee'] LOOP
      SELECT with_check INTO expression FROM pg_policies WHERE schemaname='public' AND tablename=table_name AND cmd='INSERT';
      candidate:=CASE WHEN table_name='store_reports' THEN jsonb_build_object('input_by',own_name) ELSE jsonb_build_object('reported_by',actor_email) END;
      EXECUTE format('SELECT %s FROM jsonb_populate_record(NULL::public.%I,$1) AS %I',expression,table_name,table_name) INTO allowed USING candidate;
      IF allowed IS DISTINCT FROM true THEN RAISE EXCEPTION 'Real author denied for %',table_name; END IF;
      candidate:=CASE WHEN table_name='store_reports' THEN jsonb_build_object('input_by','other@example.invalid') ELSE jsonb_build_object('reported_by','other@example.invalid') END;
      EXECUTE format('SELECT %s FROM jsonb_populate_record(NULL::public.%I,$1) AS %I',expression,table_name,table_name) INTO allowed USING candidate;
      IF allowed IS TRUE THEN RAISE EXCEPTION 'Impersonated author allowed for %',table_name; END IF;
    END LOOP;
    result:=public.award_activity_reward(actor_id,'form_submission','{}'::jsonb);
    IF coalesce((result->>'success')::boolean,true) OR coalesce((result->>'reward_given')::numeric,-1)<>0 THEN
      RAISE EXCEPTION 'Browser activity can issue an unverified self-award';
    END IF;
    result:=public.award_activity_reward('00000000-0000-0000-0000-000000000002','form_submission','{}'::jsonb);
    IF coalesce((result->>'success')::boolean,true) OR coalesce((result->>'reward_given')::numeric,-1)<>0 THEN
      RAISE EXCEPTION 'Browser activity can award another account';
    END IF;
    RESET ROLE;
    RAISE EXCEPTION USING ERRCODE='P7777',MESSAGE='rollback security request context';
  EXCEPTION WHEN SQLSTATE 'P7777' THEN NULL;
  END;
END $$;