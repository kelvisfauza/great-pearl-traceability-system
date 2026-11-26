CREATE TABLE public.external_payout_requests (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), kind text NOT NULL, recipient_name text NOT NULL, recipient_phone text NOT NULL, national_id text, description text NOT NULL, amount numeric NOT NULL, charge numeric NOT NULL DEFAULT 0, payment_method text NOT NULL DEFAULT 'mobile_money', provider text NOT NULL DEFAULT 'yo', notes text, requested_by uuid NOT NULL, requested_email text NOT NULL, requested_name text NOT NULL, approved_by uuid, approved_email text, approved_at timestamptz, status text NOT NULL DEFAULT 'pending', result_record_id uuid, result_status text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.external_payout_requests TO authenticated;
GRANT ALL ON public.external_payout_requests TO service_role;
ALTER TABLE public.external_payout_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY external_payout_admin_read ON public.external_payout_requests FOR SELECT TO authenticated USING (public.is_current_user_admin() OR requested_by=auth.uid());
ALTER TABLE public.meal_disbursements ADD COLUMN external_request_id uuid UNIQUE;
ALTER TABLE public.support_staff_per_diem ADD COLUMN external_request_id uuid UNIQUE;
CREATE OR REPLACE FUNCTION public.validate_external_payout_request() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
 IF NEW.kind NOT IN ('meal','support') OR NEW.payment_method NOT IN ('mobile_money','cash') OR NEW.provider NOT IN ('yo','gosente') OR NEW.amount<500 OR NEW.charge<0 OR NEW.amount::text IN ('NaN','Infinity','-Infinity') OR NEW.charge::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'Invalid external payout request'; END IF;
 IF NEW.payment_method='mobile_money' AND NEW.recipient_phone !~ '^256[0-9]{9}$' THEN RAISE EXCEPTION 'Invalid recipient phone'; END IF;
 IF TG_OP='UPDATE' AND (to_jsonb(NEW)-ARRAY['status','approved_by','approved_email','approved_at','result_record_id','result_status','updated_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['status','approved_by','approved_email','approved_at','result_record_id','result_status','updated_at']) THEN RAISE EXCEPTION 'Saved payout details cannot change'; END IF;
 IF NEW.approved_by=NEW.requested_by OR lower(NEW.approved_email)=lower(NEW.requested_email) THEN RAISE EXCEPTION 'Another administrator must approve this payout'; END IF;
 NEW.updated_at:=now(); RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.validate_external_payout_request() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER validate_external_payout BEFORE INSERT OR UPDATE ON public.external_payout_requests FOR EACH ROW EXECUTE FUNCTION public.validate_external_payout_request();
ALTER TABLE public.qr_access_otps ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0;
ALTER FUNCTION public.qr_access_set_pin(text,text,text) RENAME TO selected_qr_set_pin_impl;
ALTER FUNCTION public.qr_access_enroll_device(text,text,text,text) RENAME TO selected_qr_enroll_impl;
REVOKE ALL ON FUNCTION public.selected_qr_set_pin_impl(text,text,text),public.selected_qr_enroll_impl(text,text,text,text) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.qr_access_set_pin(_lookup text,_otp text,_new_pin text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE emp public.employees; challenge public.qr_access_otps;
BEGIN
 emp:=public._qr_lookup_employee(_lookup);
 IF emp.id IS NULL OR coalesce(emp.disabled,false) OR lower(emp.status)<>'active' THEN RETURN jsonb_build_object('ok',false,'error','account_unavailable'); END IF;
 SELECT * INTO challenge FROM public.qr_access_otps WHERE employee_id=emp.id AND purpose='setup_pin' AND consumed_at IS NULL AND expires_at>now() ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
 IF challenge.id IS NULL OR challenge.attempts>=5 THEN RETURN jsonb_build_object('ok',false,'error','invalid_or_expired_otp'); END IF;
 UPDATE public.qr_access_otps SET attempts=attempts+1 WHERE id=challenge.id;
 RETURN public.selected_qr_set_pin_impl(_lookup,_otp,_new_pin);
END $$;
CREATE OR REPLACE FUNCTION public.qr_access_enroll_device(_lookup text,_otp text,_pin text,_device_label text DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE emp public.employees; challenge public.qr_access_otps;
BEGIN
 emp:=public._qr_lookup_employee(_lookup);
 IF emp.id IS NULL OR coalesce(emp.disabled,false) OR lower(emp.status)<>'active' THEN RETURN jsonb_build_object('ok',false,'error','account_unavailable'); END IF;
 SELECT * INTO challenge FROM public.qr_access_otps WHERE employee_id=emp.id AND purpose='enroll_device' AND consumed_at IS NULL AND expires_at>now() ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
 IF challenge.id IS NULL OR challenge.attempts>=5 THEN RETURN jsonb_build_object('ok',false,'error','invalid_or_expired_otp'); END IF;
 UPDATE public.qr_access_otps SET attempts=attempts+1 WHERE id=challenge.id;
 RETURN public.selected_qr_enroll_impl(_lookup,_otp,_pin,_device_label);
END $$;
REVOKE ALL ON FUNCTION public.qr_access_set_pin(text,text,text),public.qr_access_enroll_device(text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.qr_access_set_pin(text,text,text),public.qr_access_enroll_device(text,text,text,text) TO service_role;