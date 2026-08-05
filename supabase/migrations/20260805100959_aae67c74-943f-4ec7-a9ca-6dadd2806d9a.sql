DROP FUNCTION IF EXISTS public.award_activity_reward(uuid, text);
GRANT EXECUTE ON FUNCTION public.award_activity_reward(uuid, text, jsonb) TO authenticated, service_role;