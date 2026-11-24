CREATE SCHEMA IF NOT EXISTS vendor_accounts_private;
REVOKE ALL ON SCHEMA vendor_accounts_private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA vendor_accounts_private TO authenticated, service_role;
ALTER TABLE public.service_providers ADD COLUMN vendor_number text, ADD COLUMN service_category text NOT NULL DEFAULT 'services';
CREATE SEQUENCE vendor_accounts_private.vendor_number_seq;
UPDATE public.service_providers SET vendor_number = 'VND-' || lpad(nextval('vendor_accounts_private.vendor_number_seq')::text,8,'0') WHERE vendor_number IS NULL;
ALTER TABLE public.service_providers ALTER COLUMN vendor_number SET DEFAULT ('VND-' || lpad(nextval('vendor_accounts_private.vendor_number_seq')::text,8,'0')), ALTER COLUMN vendor_number SET NOT NULL;
ALTER TABLE public.service_providers ADD CONSTRAINT service_providers_vendor_number_key UNIQUE(vendor_number);
GRANT USAGE ON SEQUENCE vendor_accounts_private.vendor_number_seq TO authenticated,service_role;
ALTER TABLE public.provider_submission_requests ADD COLUMN service_provider_id uuid REFERENCES public.service_providers(id) ON DELETE RESTRICT;
CREATE INDEX provider_submission_vendor_idx ON public.provider_submission_requests(service_provider_id,created_at);
CREATE FUNCTION vendor_accounts_private.allowed() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT public.is_active_staff() AND (
 public.is_procurement_reviewer(auth.uid()) OR public.is_current_user_admin()
 OR public.user_has_permission('Finance') OR public.user_has_permission('Finance Management') OR public.user_has_permission('Finance:approve') OR public.user_has_permission('Finance:process') OR public.user_has_permission('Procurement')
 OR EXISTS(SELECT 1 FROM public.employees e WHERE lower(e.email)=lower(auth.jwt()->>'email') AND e.role IN ('Administrator','Super Admin','Manager','Finance','Finance Manager'))
 ); $$;
REVOKE ALL ON FUNCTION vendor_accounts_private.allowed() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION vendor_accounts_private.allowed() TO authenticated,service_role;
CREATE FUNCTION vendor_accounts_private.phone(p text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path=public AS $$ SELECT CASE WHEN length(regexp_replace(coalesce(p,''),'[^0-9]','','g'))=10 AND left(regexp_replace(coalesce(p,''),'[^0-9]','','g'),1)='0' THEN '256'||right(regexp_replace(p,'[^0-9]','','g'),9) WHEN length(regexp_replace(coalesce(p,''),'[^0-9]','','g'))=9 THEN '256'||regexp_replace(p,'[^0-9]','','g') ELSE regexp_replace(coalesce(p,''),'[^0-9]','','g') END $$;
REVOKE ALL ON FUNCTION vendor_accounts_private.phone(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION vendor_accounts_private.phone(text) TO authenticated,service_role;
CREATE FUNCTION vendor_accounts_private.match(p_name text,p_phone text) RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT CASE WHEN count(*)=1 THEN (array_agg(id))[1] ELSE NULL END FROM public.service_providers WHERE lower(trim(name))=lower(trim(p_name)) AND vendor_accounts_private.phone(phone)=vendor_accounts_private.phone(p_phone) AND length(vendor_accounts_private.phone(p_phone))>=9; $$;
REVOKE ALL ON FUNCTION vendor_accounts_private.match(text,text) FROM PUBLIC,anon;
CREATE FUNCTION vendor_accounts_private.guard_request() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE matched uuid; v public.service_providers;
BEGIN
 IF TG_OP='INSERT' THEN
  matched := vendor_accounts_private.match(NEW.provider_name,NEW.phone);
  IF NEW.service_provider_id IS NOT NULL THEN
   SELECT * INTO v FROM public.service_providers WHERE id=NEW.service_provider_id;
   IF NOT FOUND OR lower(trim(v.name))<>lower(trim(NEW.provider_name)) OR vendor_accounts_private.phone(v.phone)<>vendor_accounts_private.phone(NEW.phone) THEN RAISE EXCEPTION 'Vendor name and phone must match the selected account'; END IF;
  ELSE NEW.service_provider_id:=matched; END IF;
 ELSIF NEW.service_provider_id IS DISTINCT FROM OLD.service_provider_id THEN
  IF auth.uid() IS NULL OR NOT vendor_accounts_private.allowed() THEN RAISE EXCEPTION 'Only authorized staff can attach a vendor'; END IF;
  IF OLD.status<>'pending' THEN RAISE EXCEPTION 'Vendor attachment can only change before approval'; END IF;
 END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION vendor_accounts_private.guard_request() FROM PUBLIC,anon,authenticated;
UPDATE public.provider_submission_requests SET service_provider_id=vendor_accounts_private.match(provider_name,phone) WHERE service_provider_id IS NULL AND vendor_accounts_private.match(provider_name,phone) IS NOT NULL;
CREATE TRIGGER vendor_account_link_request BEFORE INSERT OR UPDATE OF service_provider_id ON public.provider_submission_requests FOR EACH ROW EXECUTE FUNCTION vendor_accounts_private.guard_request();
CREATE FUNCTION vendor_accounts_private.guard_review() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF NEW.source_table='provider_submission_requests' AND NEW.decision='approved' AND (TG_OP='INSERT' OR OLD.decision IN ('pending','returned')) THEN
  IF EXISTS(SELECT 1 FROM public.provider_submission_requests r WHERE r.id=NEW.record_id::uuid AND r.request_type IN ('meal_plan','service_provider') AND r.service_provider_id IS NULL) THEN RAISE EXCEPTION 'Attach a vendor account before sending this request for approval'; END IF;
 END IF; RETURN NEW; END; $$;
REVOKE ALL ON FUNCTION vendor_accounts_private.guard_review() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER vendor_account_before_review BEFORE INSERT OR UPDATE OF decision ON public.procurement_reviews FOR EACH ROW EXECUTE FUNCTION vendor_accounts_private.guard_review();
CREATE FUNCTION vendor_accounts_private.guard_number() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN IF NEW.vendor_number IS DISTINCT FROM OLD.vendor_number THEN RAISE EXCEPTION 'Vendor account numbers cannot change'; END IF; NEW.updated_at=now(); RETURN NEW; END; $$;
REVOKE ALL ON FUNCTION vendor_accounts_private.guard_number() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER immutable_vendor_account_number BEFORE UPDATE ON public.service_providers FOR EACH ROW EXECUTE FUNCTION vendor_accounts_private.guard_number();
GRANT SELECT,INSERT,UPDATE ON public.service_providers TO authenticated;
GRANT ALL ON public.service_providers TO service_role;
CREATE POLICY "Shared vendor account staff reads" ON public.service_providers FOR SELECT TO authenticated USING(vendor_accounts_private.allowed());
CREATE FUNCTION vendor_accounts_private.action(p_action text,p_vendor uuid DEFAULT NULL,p_request uuid DEFAULT NULL,p_details jsonb DEFAULT '{}'::jsonb,p_offset integer DEFAULT 0) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result jsonb; v public.service_providers; r public.provider_submission_requests; rows_json jsonb; totals_json jsonb;
BEGIN
 IF NOT vendor_accounts_private.allowed() THEN RAISE EXCEPTION 'Only active Finance, Procurement and administrators can access vendor accounts'; END IF;
 IF p_action='list' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(s)),'[]'::jsonb) INTO result FROM (SELECT * FROM public.service_providers ORDER BY name,id LIMIT 100 OFFSET greatest(p_offset,0)) s;
  RETURN jsonb_build_object('vendors',result);
 ELSIF p_action='create' THEN
  IF length(trim(coalesce(p_details->>'name','')))<2 OR length(vendor_accounts_private.phone(p_details->>'phone'))<9 THEN RAISE EXCEPTION 'Enter the vendor name and a valid phone number'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(lower(trim(p_details->>'name'))||vendor_accounts_private.phone(p_details->>'phone')));
  IF EXISTS(SELECT 1 FROM public.service_providers WHERE lower(trim(name))=lower(trim(p_details->>'name')) AND vendor_accounts_private.phone(phone)=vendor_accounts_private.phone(p_details->>'phone')) THEN RAISE EXCEPTION 'This vendor already has an account; select the existing account'; END IF;
  INSERT INTO public.service_providers(name,phone,email,service_category,notes) VALUES(trim(p_details->>'name'),vendor_accounts_private.phone(p_details->>'phone'),nullif(trim(p_details->>'email'),''),coalesce(nullif(p_details->>'service_category',''),'services'),nullif(p_details->>'notes','')) RETURNING * INTO v;
  RETURN jsonb_build_object('vendor',to_jsonb(v));
 ELSIF p_action='link' THEN
  SELECT * INTO v FROM public.service_providers WHERE id=p_vendor; IF NOT FOUND THEN RAISE EXCEPTION 'Vendor account not found'; END IF;
  SELECT * INTO r FROM public.provider_submission_requests WHERE id=p_request FOR UPDATE; IF NOT FOUND OR r.status<>'pending' THEN RAISE EXCEPTION 'Only pending requests can be attached'; END IF;
  IF EXISTS(SELECT 1 FROM public.procurement_reviews WHERE source_table='provider_submission_requests' AND record_id=p_request::text AND decision NOT IN ('pending','returned')) THEN RAISE EXCEPTION 'This request has already been reviewed'; END IF;
  UPDATE public.provider_submission_requests SET service_provider_id=p_vendor,updated_at=now() WHERE id=p_request;
  INSERT INTO public.audit_logs(action,table_name,record_id,performed_by,reason,record_data) VALUES('VENDOR_REQUEST_ATTACHED','provider_submission_requests',p_request::text,auth.jwt()->>'email','Staff confirmed vendor account',jsonb_build_object('vendor_number',v.vendor_number,'previous_vendor_id',r.service_provider_id,'vendor_id',p_vendor));
  RETURN jsonb_build_object('ok',true);
 ELSIF p_action='history' THEN
  SELECT * INTO v FROM public.service_providers WHERE id=p_vendor; IF NOT FOUND THEN RAISE EXCEPTION 'Vendor account not found'; END IF;
  WITH items AS (
   SELECT r.id,r.created_at,r.request_type,r.paper_document_number,r.invoice_number,r.description,r.status,r.amount AS requested_amount,
    CASE WHEN r.status IN ('awaiting_finance','processing','paid') OR r.admin_approved_amount IS NOT NULL THEN coalesce(r.admin_approved_amount,r.amount)+coalesce(r.admin_approved_charge,0) ELSE 0 END AS approved_amount,
    CASE WHEN pp.id IS NOT NULL THEN coalesce((SELECT sum(i.amount) FROM public.partial_payment_installments i WHERE i.partial_payment_id=pp.id),0) WHEN r.status='paid' THEN coalesce(r.admin_approved_amount,r.amount)+coalesce(r.admin_approved_charge,0) ELSE 0 END AS paid_amount,
    r.reviewed_by_name,r.admin_approved_by_name,r.finance_released_by_name,r.rejection_reason,r.payout_status,r.requested_payment_method,pr.reviewed_by AS procurement_reviewed_by,pr.reviewed_at AS procurement_reviewed_at,pr.decision AS procurement_decision,pr.notes AS procurement_notes
   FROM public.provider_submission_requests r LEFT JOIN public.partial_payments pp ON pp.source_type='provider' AND pp.source_id=r.id::text LEFT JOIN public.procurement_reviews pr ON pr.source_table='provider_submission_requests' AND pr.record_id=r.id::text WHERE r.service_provider_id=p_vendor
  ) SELECT jsonb_build_object('requested',coalesce(sum(requested_amount),0),'approved',coalesce(sum(approved_amount),0),'paid',coalesce(sum(paid_amount),0),'outstanding',coalesce(sum(greatest(approved_amount-paid_amount,0)) FILTER(WHERE status NOT IN ('rejected','cancelled','failed')),0),'count',count(*)),(SELECT coalesce(jsonb_agg(to_jsonb(page)),'[]'::jsonb) FROM (SELECT * FROM items ORDER BY created_at DESC,id LIMIT 50 OFFSET greatest(p_offset,0)) page) INTO totals_json,rows_json FROM items;
  RETURN jsonb_build_object('vendor',to_jsonb(v),'totals',totals_json,'requests',rows_json);
 END IF; RAISE EXCEPTION 'Unknown vendor action';
END; $$;
REVOKE ALL ON FUNCTION vendor_accounts_private.action(text,uuid,uuid,jsonb,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION vendor_accounts_private.action(text,uuid,uuid,jsonb,integer) TO authenticated,service_role;
CREATE FUNCTION public.vendor_account_action(p_action text,p_vendor uuid DEFAULT NULL,p_request uuid DEFAULT NULL,p_details jsonb DEFAULT '{}'::jsonb,p_offset integer DEFAULT 0) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path=public AS $$ SELECT vendor_accounts_private.action(p_action,p_vendor,p_request,p_details,p_offset); $$;
REVOKE ALL ON FUNCTION public.vendor_account_action(text,uuid,uuid,jsonb,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.vendor_account_action(text,uuid,uuid,jsonb,integer) TO authenticated,service_role;