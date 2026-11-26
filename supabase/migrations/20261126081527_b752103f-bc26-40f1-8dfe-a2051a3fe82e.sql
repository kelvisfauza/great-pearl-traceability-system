ALTER TABLE public.quotations ADD COLUMN assigned_to uuid;
CREATE OR REPLACE FUNCTION public.selected_reply_assignment_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF auth.uid() IS NOT NULL AND ((TG_OP='INSERT' AND NEW.assigned_to IS NOT NULL) OR (TG_OP='UPDATE' AND NEW.assigned_to IS DISTINCT FROM OLD.assigned_to)) AND NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role::text IN ('Administrator','Super Admin')) THEN RAISE EXCEPTION 'Only administrators can assign reply responsibility' USING ERRCODE='42501'; END IF; RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.selected_reply_assignment_guard() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER selected_reply_assignment BEFORE INSERT OR UPDATE ON public.quotations FOR EACH ROW EXECUTE FUNCTION public.selected_reply_assignment_guard();
CREATE TRIGGER selected_reply_assignment BEFORE INSERT OR UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.selected_reply_assignment_guard();
CREATE OR REPLACE FUNCTION public.assign_reply_owner(p_kind text,p_record_id uuid,p_employee_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE target public.employees; caller public.employees;
BEGIN
 SELECT * INTO caller FROM public.employees WHERE lower(email)=lower(auth.jwt()->>'email') AND NOT coalesce(disabled,false) AND lower(status)='active' LIMIT 1;
 IF caller.id IS NULL OR NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role::text IN ('Administrator','Super Admin')) THEN RAISE EXCEPTION 'Administrator required' USING ERRCODE='42501'; END IF;
 SELECT * INTO target FROM public.employees WHERE id=p_employee_id AND NOT coalesce(disabled,false) AND lower(status)='active';
 IF target.id IS NULL THEN RAISE EXCEPTION 'Active assigned employee required'; END IF;
 IF p_kind='quotation' THEN UPDATE public.quotations SET assigned_to=target.id WHERE id=p_record_id;
 ELSIF p_kind='support' THEN UPDATE public.support_tickets SET assigned_to=target.id WHERE id=p_record_id;
 ELSE RAISE EXCEPTION 'Unsupported assignment'; END IF;
 IF NOT FOUND THEN RAISE EXCEPTION 'Record unavailable'; END IF;
 INSERT INTO public.audit_logs(action,table_name,record_id,performed_by,reason) VALUES('REPLY_OWNER_ASSIGNED',CASE WHEN p_kind='quotation' THEN 'quotations' ELSE 'support_tickets' END,p_record_id::text,caller.email,'Assigned to employee '||target.id::text);
 RETURN jsonb_build_object('ok',true);
END $$;
REVOKE ALL ON FUNCTION public.assign_reply_owner(text,uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.assign_reply_owner(text,uuid,uuid) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.selected_external_record_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF auth.uid() IS NOT NULL THEN RAISE EXCEPTION 'Use the saved independent approval workflow' USING ERRCODE='42501'; END IF;
 IF NEW.external_request_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.external_payout_requests r WHERE r.id=NEW.external_request_id AND r.status='processing' AND r.approved_by IS NOT NULL AND r.approved_by<>r.requested_by AND r.recipient_phone=CASE WHEN NEW.receiver_phone='N/A' THEN '' ELSE NEW.receiver_phone END AND r.amount=NEW.amount AND r.charge=NEW.withdraw_charge) THEN RAISE EXCEPTION 'Saved payout approval mismatch'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.selected_external_record_guard() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER selected_external_record BEFORE INSERT ON public.meal_disbursements FOR EACH ROW EXECUTE FUNCTION public.selected_external_record_guard();
CREATE TRIGGER selected_external_record BEFORE INSERT ON public.support_staff_per_diem FOR EACH ROW EXECUTE FUNCTION public.selected_external_record_guard();
CREATE OR REPLACE FUNCTION public.award_meeting_attendance_bonus(_call_id uuid,_interacted boolean DEFAULT false) RETURNS json LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$ SELECT json_build_object('success',false,'error','Meeting rewards require independent review; editable call records cannot authorize wallet credits') $$;
CREATE OR REPLACE FUNCTION public.award_all_meeting_attendance_bonuses(_call_id uuid) RETURNS json LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$ SELECT json_build_object('success',false,'error','Meeting rewards require independent review; editable call records cannot authorize wallet credits') $$;
CREATE OR REPLACE FUNCTION public.award_host_meeting_bonus(_call_id uuid) RETURNS json LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$ SELECT json_build_object('success',false,'error','Meeting rewards require independent review; editable call records cannot authorize wallet credits') $$;
REVOKE ALL ON FUNCTION public.award_meeting_attendance_bonus(uuid,boolean),public.award_all_meeting_attendance_bonuses(uuid),public.award_host_meeting_bonus(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.award_meeting_attendance_bonus(uuid,boolean),public.award_all_meeting_attendance_bonuses(uuid),public.award_host_meeting_bonus(uuid) TO service_role;