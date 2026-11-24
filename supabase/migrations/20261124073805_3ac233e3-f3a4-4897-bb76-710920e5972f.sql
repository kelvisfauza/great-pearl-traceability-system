DO $$ DECLARE staff_id uuid; staff_email text; v uuid; r uuid; result jsonb; denied boolean; BEGIN
 SELECT u.id,u.email INTO staff_id,staff_email FROM auth.users u JOIN public.employees e ON lower(e.email)=lower(u.email) WHERE lower(e.status)='active' AND coalesce(e.disabled,false)=false AND (e.role IN ('Finance','Finance Manager') OR coalesce(e.permissions,ARRAY[]::text[]) && ARRAY['Finance','Finance Management']) LIMIT 1;
 IF staff_id IS NULL THEN RAISE EXCEPTION 'Finance test identity missing'; END IF;
 IF has_function_privilege('anon','public.vendor_account_action(text,uuid,uuid,jsonb,integer)','EXECUTE') OR has_function_privilege('anon','public.vendor_account_payments(uuid,integer)','EXECUTE') THEN RAISE EXCEPTION 'Anonymous access must be denied'; END IF;
 BEGIN
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',staff_id,'email',staff_email,'role','authenticated')::text,true);
 result:=public.vendor_account_action('create',p_details=>'{"name":"Vendor regression temporary","phone":"0770000001","service_category":"meals_catering"}'); v:=(result->'vendor'->>'id')::uuid;
 result:=public.vendor_account_action('list'); IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(result->'vendors') x WHERE x->>'id'=v::text) THEN RAISE EXCEPTION 'Finance must see vendor accounts'; END IF;
 denied:=false; BEGIN PERFORM public.vendor_account_action('create',p_details=>'{"name":"Vendor regression temporary","phone":"256770000001"}'); EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE 'This vendor already has an account%' THEN RAISE; END IF; denied:=true; END; IF NOT denied THEN RAISE EXCEPTION 'Duplicate account allowed'; END IF;
 INSERT INTO public.provider_submission_requests(request_type,provider_name,phone,amount,description) VALUES('service_provider','Vendor regression temporary','0770000001',10000,'Temporary linking test') RETURNING id INTO r;
 IF (SELECT service_provider_id FROM public.provider_submission_requests WHERE id=r) IS DISTINCT FROM v THEN RAISE EXCEPTION 'Automatic linking failed'; END IF;
 DELETE FROM public.provider_submission_requests WHERE id=r;
 INSERT INTO public.provider_submission_requests(request_type,provider_name,phone,amount,description) VALUES('service_provider','Vendor regression temporary','0770000002',10000,'Temporary unmatched test') RETURNING id INTO r;
 IF (SELECT service_provider_id FROM public.provider_submission_requests WHERE id=r) IS NOT NULL THEN RAISE EXCEPTION 'Ambiguous provider linked'; END IF;
 denied:=false; BEGIN INSERT INTO public.procurement_reviews(source_table,record_id,decision) VALUES('provider_submission_requests',r::text,'approved'); EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE 'Attach a vendor account%' THEN RAISE; END IF; denied:=true; END; IF NOT denied THEN RAISE EXCEPTION 'Unlinked service approval allowed'; END IF;
 UPDATE public.provider_submission_requests SET request_type='meal_plan' WHERE id=r;
 denied:=false; BEGIN INSERT INTO public.procurement_reviews(source_table,record_id,decision) VALUES('provider_submission_requests',r::text,'approved'); EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE 'Attach a vendor account%' THEN RAISE; END IF; denied:=true; END; IF NOT denied THEN RAISE EXCEPTION 'Unlinked meal approval allowed'; END IF;
 PERFORM public.vendor_account_action('link',p_vendor=>v,p_request=>r);
 IF (SELECT phone FROM public.provider_submission_requests WHERE id=r)<>'0770000002' THEN RAISE EXCEPTION 'Recipient phone changed'; END IF;
 result:=public.vendor_account_action('history',p_vendor=>v); IF (result->'totals'->>'requested')::numeric<>10000 OR (result->'totals'->>'paid')::numeric<>0 THEN RAISE EXCEPTION 'Pending totals incorrect'; END IF;
 UPDATE public.provider_submission_requests SET admin_approved_amount=8000,status='awaiting_finance' WHERE id=r;
 result:=public.vendor_account_action('history',p_vendor=>v); IF (result->'totals'->>'approved')::numeric<>8000 OR (result->'totals'->>'outstanding')::numeric<>8000 OR (result->'totals'->>'paid')::numeric<>0 THEN RAISE EXCEPTION 'Approved totals incorrect'; END IF;
 result:=public.vendor_account_payments(v); IF (result->>'paid')::numeric<>0 THEN RAISE EXCEPTION 'Unrecorded payments counted'; END IF;
 denied:=false; BEGIN UPDATE public.service_providers SET vendor_number='VND-CHANGED' WHERE id=v; EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE 'Vendor account numbers cannot change%' THEN RAISE; END IF; denied:=true; END; IF NOT denied THEN RAISE EXCEPTION 'Number mutable'; END IF;
 PERFORM set_config('request.jwt.claims','{}',true); denied:=false; BEGIN PERFORM public.vendor_account_action('list'); EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE 'Only active Finance%' THEN RAISE; END IF; denied:=true; END; IF NOT denied THEN RAISE EXCEPTION 'Signed-out access allowed'; END IF;
 RAISE EXCEPTION USING ERRCODE='ZX001',MESSAGE='Rollback successful tests'; EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL; END;
 IF EXISTS(SELECT 1 FROM public.service_providers WHERE id=v) THEN RAISE EXCEPTION 'Test fixture retained'; END IF;
END $$;