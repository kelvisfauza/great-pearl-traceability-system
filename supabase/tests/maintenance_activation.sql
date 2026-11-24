-- Production-safe rollback check: no maintenance state, alert or message commits.
DO $$
DECLARE account_id uuid; account_email text; maintenance_id uuid;
BEGIN
 SELECT u.id,u.email INTO account_id,account_email FROM auth.users u
 JOIN public.user_roles r ON r.user_id=u.id AND r.role IN ('Super Admin','Administrator')
 JOIN public.employees e ON lower(e.email)=lower(u.email)
 WHERE lower(e.status)='active' AND coalesce(e.disabled,false)=false LIMIT 1;
 IF account_id IS NULL THEN RAISE EXCEPTION 'An active protected administrator is needed'; END IF;
 BEGIN
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',account_id,'email',account_email,'role','authenticated')::text,true);
  SET LOCAL ROLE authenticated;
  SELECT id INTO maintenance_id FROM public.system_maintenance ORDER BY is_active DESC,updated_at DESC LIMIT 1;
  IF maintenance_id IS NULL THEN RAISE EXCEPTION 'Maintenance record is missing'; END IF;
  UPDATE public.system_maintenance SET is_active=true,reason='Rollback-only activation check',
   recovery_key='2468135790',recovery_pin='1357' WHERE id=maintenance_id;
  IF NOT (SELECT is_active FROM public.get_maintenance_status()) THEN RAISE EXCEPTION 'Saved activation is not visible in public status'; END IF;
  IF (SELECT recovery_key='2468135790' OR recovery_pin='1357' FROM public.system_maintenance WHERE id=maintenance_id) THEN
   RAISE EXCEPTION 'Recovery credentials were not hashed';
  END IF;
  IF public.verify_and_deactivate_maintenance('0000000000','0000') THEN RAISE EXCEPTION 'Wrong credentials restored service'; END IF;
  IF NOT public.verify_maintenance_recovery_key('2468135790') THEN RAISE EXCEPTION 'Legacy code check rejects the saved code'; END IF;
  IF public.verify_maintenance_recovery_key('0000000000') THEN RAISE EXCEPTION 'Legacy code check accepts a wrong code'; END IF;
  IF NOT public.verify_maintenance_recovery_pin('1357') THEN RAISE EXCEPTION 'Legacy PIN check rejects the saved PIN'; END IF;
  IF public.verify_maintenance_recovery_pin('0000') THEN RAISE EXCEPTION 'Legacy PIN check accepts a wrong PIN'; END IF;
  IF NOT (SELECT is_active FROM public.get_maintenance_status()) THEN RAISE EXCEPTION 'Wrong credentials changed maintenance state'; END IF;
  IF NOT public.verify_and_deactivate_maintenance('2468135790','1357') THEN RAISE EXCEPTION 'Correct credentials could not restore service'; END IF;
  IF (SELECT is_active FROM public.get_maintenance_status()) THEN RAISE EXCEPTION 'Maintenance stayed active after valid recovery'; END IF;
  RAISE EXCEPTION USING ERRCODE='P7777',MESSAGE='Rollback successful maintenance check';
 EXCEPTION WHEN SQLSTATE 'P7777' THEN NULL;
 END;
END $$;