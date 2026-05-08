DROP FUNCTION IF EXISTS public._diag_verify(text, text);
REVOKE ALL ON FUNCTION public.verify_email_otp(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_email_otp(text,text) TO authenticated, anon, service_role;