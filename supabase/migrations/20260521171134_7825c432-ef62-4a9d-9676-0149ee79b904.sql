
DROP POLICY IF EXISTS "auth read" ON public.finance_prices;
DROP POLICY IF EXISTS "auth update" ON public.finance_prices;
DROP POLICY IF EXISTS "auth write" ON public.finance_prices;

CREATE POLICY "Finance and Admin can read finance_prices"
ON public.finance_prices FOR SELECT TO authenticated
USING (public.user_has_permission('Finance') OR public.is_current_user_admin());

CREATE POLICY "Finance and Admin can insert finance_prices"
ON public.finance_prices FOR INSERT TO authenticated
WITH CHECK (public.user_has_permission('Finance') OR public.is_current_user_admin());

CREATE POLICY "Finance and Admin can update finance_prices"
ON public.finance_prices FOR UPDATE TO authenticated
USING (public.user_has_permission('Finance') OR public.is_current_user_admin())
WITH CHECK (public.user_has_permission('Finance') OR public.is_current_user_admin());

CREATE POLICY "Finance and Admin can delete finance_prices"
ON public.finance_prices FOR DELETE TO authenticated
USING (public.user_has_permission('Finance') OR public.is_current_user_admin());

CREATE OR REPLACE FUNCTION public.hash_sms_failures_verification_code()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.verification_code IS NOT NULL AND NEW.verification_code !~ '^\$2[aby]\$' THEN
    NEW.verification_code := crypt(NEW.verification_code, gen_salt('bf'));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hash_sms_failures_verification_code ON public.sms_failures;
CREATE TRIGGER trg_hash_sms_failures_verification_code
BEFORE INSERT OR UPDATE OF verification_code ON public.sms_failures
FOR EACH ROW EXECUTE FUNCTION public.hash_sms_failures_verification_code();

UPDATE public.sms_failures
SET verification_code = crypt(verification_code, gen_salt('bf'))
WHERE verification_code IS NOT NULL AND verification_code !~ '^\$2[aby]\$';
