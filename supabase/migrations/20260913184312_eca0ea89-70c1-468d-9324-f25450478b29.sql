INSERT INTO public.system_settings (setting_key, setting_value, updated_at)
VALUES ('loyalty_awards', jsonb_build_object('suspended', true, 'reason', 'Temporary suspension of automatic loyalty-point awards', 'suspended_at', now()), now())
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = now();

CREATE OR REPLACE FUNCTION public.loyalty_awards_suspended()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE((SELECT (setting_value->>'suspended')::boolean FROM public.system_settings WHERE setting_key = 'loyalty_awards'), false)
$$;

ALTER FUNCTION public.award_activity_reward(uuid, text, jsonb) RENAME TO award_activity_reward_impl;

CREATE OR REPLACE FUNCTION public.award_activity_reward(user_uuid uuid, activity_name text, context jsonb DEFAULT '{}'::jsonb)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF public.loyalty_awards_suspended() THEN
    RETURN json_build_object('success', false, 'suspended', true, 'reward_given', 0,
      'message', 'Loyalty point awards are temporarily suspended by management.');
  END IF;
  RETURN public.award_activity_reward_impl(user_uuid, activity_name, context);
END;
$function$;

ALTER FUNCTION public.award_approval_reward(uuid, text, text) RENAME TO award_approval_reward_impl;

CREATE OR REPLACE FUNCTION public.award_approval_reward(user_uuid uuid, request_id text, approval_role text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF public.loyalty_awards_suspended() THEN
    RETURN json_build_object('success', false, 'suspended', true, 'reward_given', 0,
      'message', 'Loyalty point awards are temporarily suspended by management.');
  END IF;
  RETURN public.award_approval_reward_impl(user_uuid, request_id, approval_role);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.loyalty_awards_suspended() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.award_activity_reward(uuid, text, jsonb) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.award_approval_reward(uuid, text, text) TO anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.award_activity_reward_impl(uuid, text, jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.award_approval_reward_impl(uuid, text, text) FROM anon, authenticated;