
DROP TRIGGER IF EXISTS trg_mask_sms_failure_code ON public.sms_failures;
DROP FUNCTION IF EXISTS public.mask_sms_failure_code() CASCADE;
ALTER TABLE public.sms_failures DROP COLUMN IF EXISTS verification_code CASCADE;
