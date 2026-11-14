-- Run with migration tool; successful test writes are rolled back by the subtransaction.
DO $test$
DECLARE admin_id uuid; admin_email text; worker public.employees%rowtype;
 r public.per_diem_requests%rowtype; failure text; awards_before bigint;
BEGIN
 BEGIN
  SELECT u.id,u.email INTO admin_id,admin_email FROM auth.users u
  JOIN public.user_roles ur ON ur.user_id=u.id AND ur.role IN ('Administrator','Super Admin')
  JOIN public.employees e ON lower(e.email)=lower(u.email)
  WHERE e.disabled IS NOT TRUE AND lower(e.status)='active' LIMIT 1;
  IF admin_id IS NULL THEN RAISE EXCEPTION 'Active administrator test fixture unavailable'; END IF;
  SELECT * INTO worker FROM public.employees WHERE lower(email)<>lower(admin_email) AND disabled IS NOT TRUE LIMIT 1;
  IF worker.id IS NULL THEN RAISE EXCEPTION 'Employee test fixture unavailable'; END IF;
  PERFORM set_config('request.jwt.claim.sub',admin_id::text,true);
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',admin_id,'email',admin_email,'role','authenticated')::text,true);
  SELECT count(*) INTO awards_before FROM public.per_diem_awards;
  INSERT INTO public.per_diem_requests(created_by,employee_id,employee_email,employee_name,form_data,amount,printed_at,status,submitted_at)
  VALUES(admin_id,worker.id,worker.email,worker.name,'{"purpose":"Rollback approval test","destination":"Test","workType":"other"}',10000,now(),'pending',now()) RETURNING * INTO r;
  failure:=NULL;
  BEGIN PERFORM public.award_per_diem_request(r.id);
  EXCEPTION WHEN OTHERS THEN failure:=SQLERRM; END;
  IF failure IS DISTINCT FROM 'Administrator approval is required before awarding per diem' THEN RAISE EXCEPTION 'Unapproved award guard failed: %',failure; END IF;
  failure:=NULL;
  BEGIN PERFORM public.review_per_diem_request(r.id,true);
  EXCEPTION WHEN OTHERS THEN failure:=SQLERRM; END;
  IF failure IS DISTINCT FROM 'You cannot review your own per diem request; another administrator must review it' THEN RAISE EXCEPTION 'Self-approval guard failed: %',failure; END IF;
  UPDATE public.per_diem_requests SET created_by=gen_random_uuid() WHERE id=r.id;
  r:=public.review_per_diem_request(r.id,true);
  IF r.approved_at IS NULL OR r.approved_by IS DISTINCT FROM admin_id OR r.status<>'pending' THEN RAISE EXCEPTION 'Approved request not ready for existing award procedure'; END IF;
  failure:=NULL;
  BEGIN PERFORM public.review_per_diem_request(r.id,true);
  EXCEPTION WHEN OTHERS THEN failure:=SQLERRM; END;
  IF failure IS DISTINCT FROM 'This request is not awaiting administrator approval' THEN RAISE EXCEPTION 'Repeated approval guard failed'; END IF;
  IF (SELECT count(*) FROM public.per_diem_awards)<>awards_before THEN RAISE EXCEPTION 'Approval unexpectedly created an award'; END IF;
  IF has_table_privilege('authenticated','public.per_diem_awards','INSERT') THEN RAISE EXCEPTION 'Direct award bypass remains'; END IF;
  IF has_function_privilege('anon','public.review_per_diem_request(uuid,boolean,text)','EXECUTE') THEN RAISE EXCEPTION 'Anonymous review remains'; END IF;
  RAISE EXCEPTION USING ERRCODE='ZX001',MESSAGE='rollback successful approval test';
 EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL;
 END;
END $test$;