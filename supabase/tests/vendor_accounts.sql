-- Run through the migration tool. All fixtures roll back inside the exception block.
DO $$
DECLARE staff_id uuid; staff_email text; v uuid; r uuid; n text; result jsonb; denied boolean;
BEGIN
  IF has_function_privilege('anon','public.vendor_account_action(text,uuid,uuid,jsonb,integer)','EXECUTE') THEN
    RAISE EXCEPTION 'Anonymous callers must not browse vendor accounts';
  END IF;
  IF has_function_privilege('anon','public.vendor_account_payments(uuid,integer)','EXECUTE') THEN
    RAISE EXCEPTION 'Anonymous callers must not read vendor payments';
  END IF;
  SELECT u.id,u.email INTO staff_id,staff_email FROM auth.users u JOIN public.employees e ON lower(e.email)=lower(u.email)
  WHERE lower(e.status)='active' AND coalesce(e.disabled,false)=false AND (e.role IN ('Finance','Finance Manager') OR coalesce(e.permissions,ARRAY[]::text[]) && ARRAY['Finance','Finance Management']) LIMIT 1;
  IF staff_id IS NULL THEN RAISE EXCEPTION 'An active Finance identity is needed for the vendor access regression'; END IF;
  BEGIN
    PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',staff_id,'email',staff_email,'role','authenticated')::text,true);
    result := public.vendor_account_action('create',p_details=>jsonb_build_object('name','Vendor regression temporary','phone','0770000001','service_category','meals_catering'));
    v := (result->'vendor'->>'id')::uuid;
    n := result->'vendor'->>'vendor_number';
    IF n NOT LIKE 'VND-%' THEN RAISE EXCEPTION 'Every created vendor needs an account number'; END IF;
    result := public.vendor_account_action('list');
    IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(result->'vendors') x WHERE x->>'id'=v::text) THEN RAISE EXCEPTION 'Finance must see created vendor accounts'; END IF;
    denied:=false;
    BEGIN
      PERFORM public.vendor_account_action('create',p_details=>jsonb_build_object('name','Vendor regression temporary','phone','256770000001'));
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM NOT LIKE 'This vendor already has an account%' THEN RAISE; END IF;
      denied:=true;
    END;
    IF NOT denied THEN RAISE EXCEPTION 'Normalized duplicate vendor creation must be refused'; END IF;
    INSERT INTO public.provider_submission_requests(request_type,provider_name,phone,amount,description) VALUES('service_provider','Vendor regression temporary','0770000001',10000,'Temporary linking test') RETURNING id INTO r;
    IF (SELECT service_provider_id FROM public.provider_submission_requests WHERE id=r) IS DISTINCT FROM v THEN RAISE EXCEPTION 'Entry with matching name and phone must attach immediately'; END IF;
    DELETE FROM public.provider_submission_requests WHERE id=r;
    INSERT INTO public.provider_submission_requests(request_type,provider_name,phone,amount,description) VALUES('service_provider','Vendor regression temporary','0770000002',10000,'Temporary unmatched test') RETURNING id INTO r;
    IF (SELECT service_provider_id FROM public.provider_submission_requests WHERE id=r) IS NOT NULL THEN RAISE EXCEPTION 'A different phone must not silently attach'; END IF;
    denied:=false;
    BEGIN
      INSERT INTO public.procurement_reviews(source_table,record_id,decision) VALUES('provider_submission_requests',r::text,'approved');
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM NOT LIKE 'Attach a vendor account%' THEN RAISE; END IF;
      denied:=true;
    END;
    IF NOT denied THEN RAISE EXCEPTION 'Procurement must not clear unlinked service requests'; END IF;
    UPDATE public.provider_submission_requests SET request_type='meal_plan' WHERE id=r;
    denied:=false;
    BEGIN
      INSERT INTO public.procurement_reviews(source_table,record_id,decision) VALUES('provider_submission_requests',r::text,'approved');
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM NOT LIKE 'Attach a vendor account%' THEN RAISE; END IF;
      denied:=true;
    END;
    IF NOT denied THEN RAISE EXCEPTION 'Procurement must not clear unlinked meal requests'; END IF;
    PERFORM public.vendor_account_action('link',p_vendor=>v,p_request=>r);
    IF (SELECT phone FROM public.provider_submission_requests WHERE id=r)<>'0770000002' THEN RAISE EXCEPTION 'Attachment must preserve the submitted recipient number'; END IF;
    result:=public.vendor_account_action('history',p_vendor=>v);
    IF (result->'totals'->>'requested')::numeric<>10000 OR (result->'totals'->>'paid')::numeric<>0 THEN RAISE EXCEPTION 'A pending request is not a recorded payment'; END IF;
    UPDATE public.provider_submission_requests SET admin_approved_amount=8000,status='awaiting_finance' WHERE id=r;
    result:=public.vendor_account_action('history',p_vendor=>v);
    IF (result->'totals'->>'approved')::numeric<>8000 OR (result->'totals'->>'outstanding')::numeric<>8000 OR (result->'totals'->>'paid')::numeric<>0 THEN RAISE EXCEPTION 'Approved unpaid amounts must stay separate from payments'; END IF;
    denied:=false;
    BEGIN UPDATE public.service_providers SET vendor_number='VND-CHANGED' WHERE id=v;
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM NOT LIKE 'Vendor account numbers cannot change%' THEN RAISE; END IF;
      denied:=true;
    END;
    IF NOT denied THEN RAISE EXCEPTION 'Vendor account number must remain immutable'; END IF;
    PERFORM set_config('request.jwt.claims','{}',true);
    denied:=false;
    BEGIN PERFORM public.vendor_account_action('list');
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM NOT LIKE 'Only active Finance%' THEN RAISE; END IF;
      denied:=true;
    END;
    IF NOT denied THEN RAISE EXCEPTION 'Signed-out identities must be denied vendor access'; END IF;
    RAISE EXCEPTION USING ERRCODE='ZX001',MESSAGE='Rollback successful vendor tests';
  EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL;
  END;
  IF EXISTS(SELECT 1 FROM public.service_providers WHERE id=v) OR EXISTS(SELECT 1 FROM public.provider_submission_requests WHERE id=r) THEN RAISE EXCEPTION 'Vendor tests must retain no fixtures'; END IF;
END $$;