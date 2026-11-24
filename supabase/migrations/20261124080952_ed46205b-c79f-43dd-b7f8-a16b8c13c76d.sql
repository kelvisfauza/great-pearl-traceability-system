CREATE OR REPLACE FUNCTION public.award_approval_reward(user_uuid uuid, request_id text, approval_role text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE e public.employees%ROWTYPE; r public.approval_requests%ROWTYPE; actor text; signed_at timestamptz; approved boolean; stage text;
BEGIN
 IF public.loyalty_awards_suspended() THEN RETURN json_build_object('success',false,'suspended',true,'reward_given',0); END IF;
 IF user_uuid IS NULL OR request_id IS NULL OR approval_role NOT IN ('admin','admin1','admin2','finance') THEN RETURN json_build_object('success',false,'reward_given',0,'message','Verified approval required'); END IF;
 SELECT * INTO e FROM public.employees WHERE id=user_uuid OR auth_user_id=user_uuid LIMIT 1;
 IF NOT FOUND OR e.disabled IS TRUE THEN RETURN json_build_object('success',false,'reward_given',0,'message','Approver unavailable'); END IF;
 IF auth.uid() IS NOT NULL AND lower(e.email) IS DISTINCT FROM lower(auth.jwt()->>'email') THEN RETURN json_build_object('success',false,'reward_given',0,'message','Use your own account'); END IF;
 IF auth.uid() IS NULL AND coalesce(auth.role(),'') <> 'service_role' THEN RETURN json_build_object('success',false,'reward_given',0,'message','Not authenticated'); END IF;
 SELECT * INTO r FROM public.approval_requests WHERE id::text=request_id FOR UPDATE;
 IF NOT FOUND THEN RETURN json_build_object('success',false,'reward_given',0,'message','Verified approval required'); END IF;
 stage:=approval_role;
 IF stage='admin' AND r.admin_approved_1 IS TRUE AND lower(r.admin_approved_1_by) IN (lower(e.email),lower(e.name)) THEN stage:='admin1'; END IF;
 CASE stage
 WHEN 'admin' THEN actor:=r.admin_approved_by; signed_at:=r.admin_approved_at; approved:=r.admin_approved;
 WHEN 'admin1' THEN actor:=r.admin_approved_1_by; signed_at:=r.admin_approved_1_at; approved:=r.admin_approved_1;
 WHEN 'admin2' THEN actor:=r.admin_approved_2_by; signed_at:=r.admin_approved_2_at; approved:=r.admin_approved_2;
 WHEN 'finance' THEN actor:=r.finance_approved_by; signed_at:=r.finance_approved_at; approved:=r.finance_approved;
 END CASE;
 IF approved IS DISTINCT FROM true OR signed_at IS NULL OR actor IS NULL OR lower(actor) NOT IN (lower(e.email),lower(e.name)) THEN RETURN json_build_object('success',false,'reward_given',0,'message','Verified approval required'); END IF;
 RETURN public.award_approval_reward_impl(user_uuid,request_id,stage);
END $$;
REVOKE ALL ON FUNCTION public.award_approval_reward_impl(uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.award_approval_reward_impl(uuid,text,text) TO service_role;
ALTER POLICY "Anyone can create edit requests" ON public.edit_requests TO authenticated WITH CHECK (public.is_active_staff() AND lower(requested_by)=lower(auth.jwt()->>'email') AND status='pending');
ALTER POLICY "Users can create deletion requests" ON public.deletion_requests TO authenticated WITH CHECK (public.is_active_staff() AND (lower(requested_by)=lower(auth.jwt()->>'email') OR EXISTS(SELECT 1 FROM public.employees e WHERE lower(e.email)=lower(auth.jwt()->>'email') AND requested_by=e.name)) AND status='pending' AND reviewed_by IS NULL AND reviewed_at IS NULL AND admin_comments IS NULL);
DROP POLICY "Authenticated can insert sms failures" ON public.sms_failures;
CREATE POLICY "System records sms failures" ON public.sms_failures FOR INSERT TO service_role WITH CHECK(true);
DROP POLICY "System can insert overtime reviews" ON public.monthly_overtime_reviews;
CREATE POLICY "System creates overtime reviews" ON public.monthly_overtime_reviews FOR INSERT TO service_role WITH CHECK(true);
ALTER POLICY "Authenticated users can view calculation history" ON public.price_calculation_history TO authenticated USING (public.is_active_staff() AND (public.is_current_user_admin() OR public.user_has_permission('Procurement') OR public.user_has_permission('Finance') OR public.user_has_permission('Finance Management') OR public.user_has_permission('Data Analysis') OR public.user_has_permission('Quality Control')));