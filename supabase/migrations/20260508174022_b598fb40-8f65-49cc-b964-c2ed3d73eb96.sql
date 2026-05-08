
DROP TRIGGER IF EXISTS hash_sms_failures_code ON public.sms_failures;
DROP FUNCTION IF EXISTS public.trg_hash_sms_failures_code();

GRANT SELECT (verification_code) ON public.sms_failures TO authenticated;
