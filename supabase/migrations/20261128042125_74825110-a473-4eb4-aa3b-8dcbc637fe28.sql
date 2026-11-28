ALTER TABLE public.provider_submission_requests ADD COLUMN meal_revision integer NOT NULL DEFAULT 0, ADD COLUMN meal_correction_pending boolean NOT NULL DEFAULT false;
CREATE TABLE public.meal_plan_events (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), submission_id uuid NOT NULL REFERENCES public.provider_submission_requests(id), event_type text NOT NULL, actor text NOT NULL, reason text, before_data jsonb, after_data jsonb, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.meal_plan_events TO authenticated;
GRANT ALL ON public.meal_plan_events TO service_role;
ALTER TABLE public.meal_plan_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authorised staff read meal decision trails" ON public.meal_plan_events FOR SELECT TO authenticated USING (public.is_active_staff() AND (public.is_procurement_reviewer(auth.uid()) OR public.is_current_user_admin() OR public.can_process_finance()));
CREATE INDEX meal_plan_events_request_time ON public.meal_plan_events(submission_id,created_at);
CREATE OR REPLACE FUNCTION public.guard_meal_correction_state() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF TG_OP='INSERT' THEN
  IF auth.role() IS DISTINCT FROM 'service_role' AND (NEW.meal_revision<>0 OR NEW.meal_correction_pending) THEN RAISE EXCEPTION 'Meal correction state is system managed'; END IF;
  RETURN NEW;
 END IF;
 IF OLD.request_type='meal_plan' AND OLD.admin_approved_amount IS NOT NULL THEN
  IF (NEW.amount,NEW.description,NEW.admin_approved_amount,NEW.admin_approved_charge,NEW.phone,NEW.email,NEW.requested_payment_method,NEW.service_provider_id) IS DISTINCT FROM (OLD.amount,OLD.description,OLD.admin_approved_amount,OLD.admin_approved_charge,OLD.phone,OLD.email,OLD.requested_payment_method,OLD.service_provider_id) THEN
   IF OLD.status IN ('paid','processing','rejected') THEN RAISE EXCEPTION 'Payment has started or this meal plan is closed; refresh its status'; END IF;
   IF coalesce(current_setting('app.meal_correction',true),'')<>'yes' THEN RAISE EXCEPTION 'Use the meal-plan correction workflow for an Admin-approved plan'; END IF;
  END IF;
 END IF;
 IF auth.role() IS DISTINCT FROM 'service_role' AND coalesce(current_setting('app.meal_correction',true),'')<>'yes' AND (NEW.meal_revision,NEW.meal_correction_pending) IS DISTINCT FROM (OLD.meal_revision,OLD.meal_correction_pending) THEN RAISE EXCEPTION 'Meal correction state is system managed'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_meal_correction_state() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER guard_meal_correction_state BEFORE INSERT OR UPDATE ON public.provider_submission_requests FOR EACH ROW EXECUTE FUNCTION public.guard_meal_correction_state();
CREATE OR REPLACE FUNCTION public.track_meal_plan_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE kind text; actor_name text;
BEGIN
 IF NEW.request_type<>'meal_plan' THEN RETURN NEW; END IF;
 IF (NEW.status,NEW.amount,NEW.description,NEW.auto_approval_note,NEW.meal_correction_pending,NEW.meal_revision,NEW.payout_status) IS NOT DISTINCT FROM (OLD.status,OLD.amount,OLD.description,OLD.auto_approval_note,OLD.meal_correction_pending,OLD.meal_revision,OLD.payout_status) THEN RETURN NEW; END IF;
 kind:=CASE WHEN NEW.status='paid' THEN 'paid' WHEN NEW.status='rejected' THEN 'rejected' WHEN NEW.meal_correction_pending AND NOT OLD.meal_correction_pending THEN 'returned_to_procurement' WHEN NEW.meal_revision>OLD.meal_revision AND (NEW.amount,NEW.description) IS DISTINCT FROM (OLD.amount,OLD.description) THEN 'procurement_corrected' WHEN NEW.status='processing' THEN 'payment_claimed' WHEN OLD.status='pending' AND NEW.status='awaiting_finance' THEN 'admin_approved' ELSE 'system_check_or_payment_result' END;
 actor_name:=coalesce(nullif(current_setting('app.meal_actor',true),''),NEW.finance_released_by_name,NEW.reviewed_by_name,'System');
 INSERT INTO public.meal_plan_events(submission_id,event_type,actor,reason,before_data,after_data) VALUES(NEW.id,kind,actor_name,coalesce(NEW.auto_approval_note,NEW.payout_message),to_jsonb(OLD)-'submitter_ip',to_jsonb(NEW)-'submitter_ip');
 IF NEW.status IN ('paid','rejected') THEN
  UPDATE public.procurement_reviews SET decision=CASE WHEN NEW.status='paid' THEN 'approved' ELSE 'rejected' END, notes=concat_ws(E'\n',notes,'Closed by payment workflow: '||NEW.status),updated_at=now() WHERE source_table='provider_submission_requests' AND record_id=NEW.id::text AND decision='returned';
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.track_meal_plan_change() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER track_meal_plan_change AFTER UPDATE ON public.provider_submission_requests FOR EACH ROW EXECUTE FUNCTION public.track_meal_plan_change();
CREATE OR REPLACE FUNCTION public.return_meal_for_correction(p_id uuid,p_revision integer,p_reason text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.provider_submission_requests; pr public.procurement_reviews;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Trusted system action required'; END IF;
 SELECT * INTO s FROM public.provider_submission_requests WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR s.request_type<>'meal_plan' OR s.status<>'awaiting_finance' OR s.meal_revision<>p_revision THEN RETURN jsonb_build_object('ok',false,'error','Meal plan changed or payment started'); END IF;
 IF coalesce(trim(p_reason),'')='' THEN RAISE EXCEPTION 'Correction reason required'; END IF;
 IF EXISTS(SELECT 1 FROM public.partial_payments WHERE source_type='provider' AND source_id=p_id::text) THEN RETURN jsonb_build_object('ok',false,'error','Finance has started a part-payment workflow'); END IF;
 PERFORM set_config('app.meal_actor','System automatic checks',true);
 UPDATE public.provider_submission_requests SET meal_correction_pending=true,auto_approval_note=p_reason WHERE id=p_id;
 INSERT INTO public.procurement_reviews AS r(source_table,record_id,request_title,requested_by,amount,original_amount,decision,return_reason,returned_by,returned_at,return_count) VALUES('provider_submission_requests',p_id::text,'Meal Plan — '||s.provider_name,s.provider_name,s.amount,s.amount,'returned',p_reason,'System automatic checks',now(),1)
 ON CONFLICT(source_table,record_id) DO UPDATE SET decision='returned',return_reason=p_reason,returned_by='System automatic checks',returned_at=now(),return_count=r.return_count+1,return_notified_at=NULL,amount=s.amount,updated_at=now() RETURNING * INTO pr;
 INSERT INTO public.meal_plan_events(submission_id,event_type,actor,reason,after_data) VALUES(p_id,'correction_requested','System automatic checks',p_reason,jsonb_build_object('return_count',pr.return_count,'revision',s.meal_revision));
 RETURN jsonb_build_object('ok',true,'review',to_jsonb(pr));
END $$;
REVOKE ALL ON FUNCTION public.return_meal_for_correction(uuid,integer,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.return_meal_for_correction(uuid,integer,text) TO service_role;
CREATE OR REPLACE FUNCTION public.submit_meal_correction(p_id uuid,p_revision integer,p_amount numeric,p_description text,p_notes text DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.provider_submission_requests; actor_email text; wake_id bigint;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_active_staff() OR NOT public.is_procurement_reviewer(auth.uid()) THEN RETURN jsonb_build_object('ok',false,'error','Only active Procurement reviewers can correct meal plans'); END IF;
 IF p_amount IS NULL OR p_amount<500 OR p_amount>50000000 OR coalesce(length(trim(p_description)),0)=0 OR length(p_description)>4000 OR length(coalesce(p_notes,''))>2000 THEN RETURN jsonb_build_object('ok',false,'error','Enter a valid amount and itemised description'); END IF;
 SELECT * INTO s FROM public.provider_submission_requests WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR s.request_type<>'meal_plan' OR s.status<>'awaiting_finance' OR NOT s.meal_correction_pending OR s.meal_revision<>p_revision OR s.admin_approved_amount IS NULL THEN RETURN jsonb_build_object('ok',false,'error','This meal plan changed or payment started. Refresh before editing'); END IF;
 IF p_amount>s.admin_approved_amount THEN RETURN jsonb_build_object('ok',false,'error','Corrections cannot exceed the Admin-approved amount; a larger plan needs new Admin approval'); END IF;
 IF EXISTS(SELECT 1 FROM public.partial_payments WHERE source_type='provider' AND source_id=p_id::text) THEN RETURN jsonb_build_object('ok',false,'error','Finance has started a part-payment workflow; no correction can overwrite it'); END IF;
 actor_email:=public.current_user_email();
 PERFORM set_config('app.meal_correction','yes',true); PERFORM set_config('app.meal_actor',actor_email,true);
 UPDATE public.provider_submission_requests SET amount=p_amount,admin_approved_amount=p_amount,description=trim(p_description),meal_correction_pending=false,meal_revision=meal_revision+1,auto_approval_note='Procurement corrected the plan; automatic checks queued' WHERE id=p_id RETURNING * INTO s;
 UPDATE public.procurement_reviews SET decision='approved',edited_amount=p_amount,amount=p_amount,notes=p_notes,reviewed_by=actor_email,reviewed_at=now(),updated_at=now() WHERE source_table='provider_submission_requests' AND record_id=p_id::text AND decision='returned';
 INSERT INTO public.meal_plan_events(submission_id,event_type,actor,reason,after_data) VALUES(p_id,'correction_submitted',actor_email,p_notes,jsonb_build_object('revision',s.meal_revision,'amount',p_amount,'description',p_description,'admin_approval_retained',s.admin_approved_by_name));
 SELECT net.http_post(url:='https://pudfybkyfedeggmokhco.supabase.co/functions/v1/process-provider-submission',headers:=private_edge.header()||jsonb_build_object('Content-Type','application/json'),body:=jsonb_build_object('action','meal_recheck','submissionId',p_id,'revision',s.meal_revision),timeout_milliseconds:=120000) INTO wake_id;
 INSERT INTO public.meal_plan_events(submission_id,event_type,actor,after_data) VALUES(p_id,'automatic_recheck_queued',actor_email,jsonb_build_object('http_request_id',wake_id,'revision',s.meal_revision));
 RETURN jsonb_build_object('ok',true,'status',s.status,'revision',s.meal_revision,'message','Correction saved under existing Admin approval; automatic checks queued');
END $$;
REVOKE ALL ON FUNCTION public.submit_meal_correction(uuid,integer,numeric,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.submit_meal_correction(uuid,integer,numeric,text,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.guard_meal_partial_payment() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.provider_submission_requests;
BEGIN
 IF NEW.source_type<>'provider' THEN RETURN NEW; END IF;
 SELECT * INTO s FROM public.provider_submission_requests WHERE id=NEW.source_id::uuid FOR UPDATE;
 IF s.request_type IS DISTINCT FROM 'meal_plan' THEN RETURN NEW; END IF;
 IF TG_OP='INSERT' OR (TG_OP='UPDATE' AND NEW.paid_amount>OLD.paid_amount) THEN
  IF s.status<>'awaiting_finance' OR NEW.total_amount<>coalesce(s.admin_approved_amount,s.amount)+coalesce(s.admin_approved_charge,0) THEN RAISE EXCEPTION 'Meal plan changed or payment started; refresh Finance before paying'; END IF;
  UPDATE public.provider_submission_requests SET meal_revision=meal_revision+1,meal_correction_pending=false WHERE id=s.id;
  UPDATE public.procurement_reviews SET decision='approved',updated_at=now() WHERE source_table='provider_submission_requests' AND record_id=s.id::text AND decision='returned';
  INSERT INTO public.meal_plan_events(submission_id,event_type,actor,after_data) VALUES(s.id,'finance_part_payment_claimed',coalesce(NEW.approved_by_name,'Finance'),jsonb_build_object('paid_amount',NEW.paid_amount,'total_amount',NEW.total_amount));
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_meal_partial_payment() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER guard_meal_partial_payment BEFORE INSERT OR UPDATE ON public.partial_payments FOR EACH ROW EXECUTE FUNCTION public.guard_meal_partial_payment();