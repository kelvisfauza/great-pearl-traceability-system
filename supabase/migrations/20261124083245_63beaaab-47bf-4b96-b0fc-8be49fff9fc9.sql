CREATE OR REPLACE FUNCTION public.award_activity_reward(user_uuid uuid, activity_name text, context jsonb DEFAULT '{}'::jsonb)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE e public.employees%ROWTYPE; canonical text;
BEGIN
 IF public.loyalty_awards_suspended() THEN RETURN json_build_object('success',false,'suspended',true,'reward_given',0); END IF;
 IF user_uuid IS NULL THEN RETURN json_build_object('success',false,'reward_given',0,'message','Verified account required'); END IF;
 SELECT * INTO e FROM public.employees WHERE id=user_uuid OR auth_user_id=user_uuid LIMIT 1;
 IF NOT FOUND OR e.disabled IS TRUE OR lower(coalesce(e.status,'active')) IN ('inactive','disabled','terminated','suspended') THEN RETURN json_build_object('success',false,'reward_given',0,'message','Verified account required'); END IF;
 IF auth.uid() IS NULL AND coalesce(auth.role(),'')<>'service_role' THEN RETURN json_build_object('success',false,'reward_given',0,'message','Not authenticated'); END IF;
 IF auth.uid() IS NOT NULL AND lower(e.email) IS DISTINCT FROM lower(auth.jwt()->>'email') THEN RETURN json_build_object('success',false,'reward_given',0,'message','Use your own account'); END IF;
 canonical:=public.get_unified_user_id(e.email);
 IF canonical IS NULL OR canonical !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN RETURN json_build_object('success',false,'reward_given',0,'message','Verified account required'); END IF;
 IF activity_name NOT IN ('form_submission','data_entry','excel_data_entry','document_upload','report_generation','transaction','task_completion','group_meeting','departmental_meeting') THEN RETURN json_build_object('success',false,'reward_given',0,'message','Activity not eligible for loyalty rewards'); END IF;
 RETURN public.award_activity_reward_impl(canonical::uuid,activity_name,context);
END $$;
REVOKE ALL ON FUNCTION public.award_activity_reward(uuid,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.award_activity_reward(uuid,text,jsonb) TO authenticated,service_role;
REVOKE ALL ON FUNCTION public.award_activity_reward_impl(uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.award_activity_reward_impl(uuid,text,jsonb) TO service_role;