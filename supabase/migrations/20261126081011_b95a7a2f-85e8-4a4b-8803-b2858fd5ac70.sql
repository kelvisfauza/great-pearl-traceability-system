CREATE OR REPLACE FUNCTION public.selected_security_is_self(doc jsonb) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.employees e WHERE (e.auth_user_id=auth.uid() OR lower(e.email)=lower(auth.jwt()->>'email')) AND (lower(doc->>'employee_email')=lower(e.email) OR doc->>'employee_id' IN (e.id::text,e.employee_id,e.auth_user_id::text) OR doc->>'user_id' IN (e.id::text,e.auth_user_id::text,public.get_unified_user_id(e.email)::text)));
$$;
REVOKE ALL ON FUNCTION public.selected_security_is_self(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.selected_security_is_self(jsonb) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.selected_security_self_review_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE old_doc jsonb:=CASE WHEN TG_OP='INSERT' THEN '{}'::jsonb ELSE to_jsonb(OLD) END; new_doc jsonb:=CASE WHEN TG_OP='DELETE' THEN '{}'::jsonb ELSE to_jsonb(NEW) END; own boolean;
BEGIN
 IF auth.uid() IS NULL THEN RETURN COALESCE(NEW,OLD); END IF;
 own:=public.selected_security_is_self(old_doc) OR public.selected_security_is_self(new_doc);
 IF NOT own THEN RETURN COALESCE(NEW,OLD); END IF;
 IF TG_TABLE_NAME='bonuses' AND TG_OP='UPDATE' AND (new_doc-'status'-'claimed_at'-'updated_at')=(old_doc-'status'-'claimed_at'-'updated_at') AND new_doc->>'status'='claimed' AND old_doc->>'status' IN ('pending','allocated','unclaimed') THEN RETURN NEW; END IF;
 IF TG_TABLE_NAME='absence_appeals' AND TG_OP='UPDATE' AND (new_doc-'appeal_reason'-'appeal_submitted_at'-'appeal_status'-'updated_at')=(old_doc-'appeal_reason'-'appeal_submitted_at'-'appeal_status'-'updated_at') AND new_doc->>'appeal_status' IN ('none','pending','submitted','withdrawn') THEN RETURN NEW; END IF;
 IF TG_TABLE_NAME='attendance_import_rows' AND TG_OP='INSERT' AND coalesce(new_doc->>'row_status','pending')='pending' AND new_doc->>'approved_by' IS NULL AND new_doc->>'approved_at' IS NULL AND coalesce((new_doc->>'edited')::boolean,false)=false THEN RETURN NEW; END IF;
 IF TG_TABLE_NAME='attendance_import_rows' AND TG_OP='UPDATE' AND new_doc=old_doc THEN RETURN NEW; END IF;
 RAISE EXCEPTION 'Another authorized employee must review changes affecting your own benefits or attendance' USING ERRCODE='42501';
END $$;
REVOKE ALL ON FUNCTION public.selected_security_self_review_guard() FROM PUBLIC,anon,authenticated;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['attendance','attendance_time_records','attendance_import_rows','bonuses','absence_appeals','budget_allocations','budget_ledger_entries','airtime_batch_items'] LOOP
 EXECUTE format('CREATE TRIGGER selected_security_self_review BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.selected_security_self_review_guard()',t);
 END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.selected_security_batch_delete_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.attendance_import_rows r WHERE r.batch_id=OLD.id AND public.selected_security_is_self(to_jsonb(r))) THEN RAISE EXCEPTION 'Another authorized employee must delete a batch containing your attendance' USING ERRCODE='42501'; END IF;
 RETURN OLD;
END $$;
REVOKE ALL ON FUNCTION public.selected_security_batch_delete_guard() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER selected_security_batch_delete BEFORE DELETE ON public.attendance_import_batches FOR EACH ROW EXECUTE FUNCTION public.selected_security_batch_delete_guard();

CREATE OR REPLACE FUNCTION public.selected_security_absence_refund_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF auth.uid() IS NOT NULL AND NEW.amount>0 AND (NEW.metadata->>'type'='absence_appeal_refund' OR NEW.reference LIKE 'REFUND-ABSENCE-%') AND public.selected_security_is_self(to_jsonb(NEW)) THEN RAISE EXCEPTION 'You cannot refund your own absence deduction' USING ERRCODE='42501'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.selected_security_absence_refund_guard() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER selected_security_absence_refund BEFORE INSERT OR UPDATE ON public.ledger_entries FOR EACH ROW EXECUTE FUNCTION public.selected_security_absence_refund_guard();

CREATE OR REPLACE FUNCTION public.selected_security_employee_identity_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE protected boolean; old_doc jsonb:=CASE WHEN TG_OP='INSERT' THEN '{}'::jsonb ELSE to_jsonb(OLD) END; new_doc jsonb:=to_jsonb(NEW); field text;
BEGIN
 IF auth.uid() IS NULL THEN RETURN NEW; END IF;
 SELECT EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=auth.uid() AND r.role::text IN ('Administrator','Super Admin')) INTO protected;
 IF protected THEN RETURN NEW; END IF;
 IF TG_OP='INSERT' THEN
  IF NEW.auth_user_id IS NOT NULL OR coalesce(NEW.role,'User') NOT IN ('User','Employee','Staff','user','employee','staff') OR coalesce(NEW.permissions,'{}'::text[])<>'{}'::text[] THEN RAISE EXCEPTION 'A security administrator must assign roles, permissions and account links' USING ERRCODE='42501'; END IF;
 ELSE
  FOREACH field IN ARRAY ARRAY['role','permissions','auth_user_id','email','employee_id','bypass_sms_verification','is_training_account'] LOOP
   IF old_doc->field IS DISTINCT FROM new_doc->field THEN RAISE EXCEPTION 'A security administrator must change identity or access fields' USING ERRCODE='42501'; END IF;
  END LOOP;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.selected_security_employee_identity_guard() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER zzz_selected_security_identity BEFORE INSERT OR UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.selected_security_employee_identity_guard();

CREATE OR REPLACE FUNCTION public.selected_security_deletion_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF NEW.table_name NOT IN ('coffee_records','suppliers','supplier_contracts','buyer_contracts','sales_transactions','eudr_dispatch_reports') THEN RAISE EXCEPTION 'Unsupported deletion target' USING ERRCODE='42501'; END IF;
 IF TG_OP='UPDATE' AND (NEW.table_name IS DISTINCT FROM OLD.table_name OR NEW.record_id IS DISTINCT FROM OLD.record_id OR NEW.requested_by IS DISTINCT FROM OLD.requested_by) THEN RAISE EXCEPTION 'Deletion target and requester cannot change' USING ERRCODE='42501'; END IF;
 IF auth.uid() IS NOT NULL AND NEW.status='approved' AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
  IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'Only an administrator can approve deletions' USING ERRCODE='42501'; END IF;
  NEW.reviewed_by:=auth.jwt()->>'email'; NEW.reviewed_at:=now();
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.selected_security_deletion_guard() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER selected_security_deletion BEFORE INSERT OR UPDATE ON public.deletion_requests FOR EACH ROW EXECUTE FUNCTION public.selected_security_deletion_guard();

CREATE OR REPLACE FUNCTION public.qr_access_request_otp(_lookup text,_purpose text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE emp public.employees; code text; bytes bytea; sample bigint;
BEGIN
 IF _purpose NOT IN ('setup_pin','enroll_device') THEN RETURN jsonb_build_object('ok',false,'error','invalid_purpose'); END IF;
 emp:=public._qr_lookup_employee(_lookup);
 IF emp.id IS NULL OR coalesce(emp.disabled,false) OR lower(emp.status)<>'active' THEN RETURN jsonb_build_object('ok',false,'error','account_unavailable'); END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('qr-otp-'||emp.id::text,0));
 IF EXISTS(SELECT 1 FROM public.qr_access_otps WHERE employee_id=emp.id AND created_at>now()-interval '60 seconds') OR (SELECT count(*) FROM public.qr_access_otps WHERE employee_id=emp.id AND created_at>now()-interval '1 hour')>=5 THEN RETURN jsonb_build_object('ok',false,'error','Please wait before requesting another code'); END IF;
 LOOP
  bytes:=extensions.gen_random_bytes(4); sample:=get_byte(bytes,0)::bigint*16777216+get_byte(bytes,1)::bigint*65536+get_byte(bytes,2)::bigint*256+get_byte(bytes,3);
  EXIT WHEN sample<4294000000;
 END LOOP;
 code:=lpad((sample%1000000)::text,6,'0');
 UPDATE public.qr_access_otps SET consumed_at=now() WHERE employee_id=emp.id AND purpose=_purpose AND consumed_at IS NULL;
 INSERT INTO public.qr_access_otps(employee_id,code_hash,purpose,expires_at) VALUES(emp.id,public._qr_hash(code),_purpose,now()+interval '10 minutes');
 RETURN jsonb_build_object('ok',true,'employee_id',emp.id,'email',emp.email,'name',emp.name,'code',code);
END $$;
REVOKE ALL ON FUNCTION public.qr_access_request_otp(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.qr_access_request_otp(text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.qr_access_status(_lookup text,_device_token text DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE emp public.employees; pin_row public.qr_access_pins; trusted boolean:=false;
BEGIN
 emp:=public._qr_lookup_employee(_lookup);
 IF emp.id IS NOT NULL AND coalesce(emp.disabled,false)=false AND lower(emp.status)='active' AND length(coalesce(_device_token,''))=64 THEN
  SELECT EXISTS(SELECT 1 FROM public.qr_trusted_devices WHERE employee_id=emp.id AND device_token_hash=public._qr_hash(_device_token)) INTO trusted;
 END IF;
 IF NOT trusted THEN RETURN jsonb_build_object('ok',true,'has_pin',false,'device_trusted',false); END IF;
 SELECT * INTO pin_row FROM public.qr_access_pins WHERE employee_id=emp.id;
 RETURN jsonb_build_object('ok',true,'has_pin',pin_row.employee_id IS NOT NULL,'device_trusted',true,'locked_until',pin_row.locked_until);
END $$;
REVOKE ALL ON FUNCTION public.qr_access_status(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.qr_access_status(text,text) TO service_role;

-- Lock the selected challenge before consuming it in both existing enrollment routines.
DO $$ DECLARE name text; def text; BEGIN
 FOREACH name IN ARRAY ARRAY['qr_access_set_pin','qr_access_enroll_device'] LOOP
 SELECT pg_get_functiondef(p.oid) INTO def FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname=name;
 def:=replace(def,'ORDER BY created_at DESC LIMIT 1;','ORDER BY created_at DESC LIMIT 1 FOR UPDATE;');
 EXECUTE def;
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.qr_access_set_pin(text,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.qr_access_enroll_device(text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.qr_access_set_pin(text,text,text),public.qr_access_enroll_device(text,text,text,text) TO service_role;