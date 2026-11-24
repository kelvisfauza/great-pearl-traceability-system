REVOKE EXECUTE ON FUNCTION public.can_bypass_sms_verification(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_bypass_sms_verification(text) TO service_role;
DO $$
BEGIN
  IF has_function_privilege('anon', 'public.can_bypass_sms_verification(text)', 'EXECUTE') OR has_function_privilege('authenticated', 'public.can_bypass_sms_verification(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Verification exception lookup must not be callable directly by browser roles';
  END IF;
  IF NOT has_function_privilege('service_role', 'public.can_bypass_sms_verification(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Trusted verification services must retain exception lookup';
  END IF;
END;
$$;