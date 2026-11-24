CREATE OR REPLACE FUNCTION public.award_activity_reward(user_uuid uuid, activity_name text, context jsonb DEFAULT '{}'::jsonb)
RETURNS json LANGUAGE sql SECURITY INVOKER SET search_path=public AS $$
 SELECT json_build_object('success',false,'reward_given',0,'verification_required',true,'message','Verified system activity is required before any reward can be issued.');
$$;