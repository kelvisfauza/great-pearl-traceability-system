DROP FUNCTION IF EXISTS public.verify_admin_withdrawal_pin(uuid, text);
DROP FUNCTION IF EXISTS public.verify_login_otp(uuid, text);

CREATE OR REPLACE FUNCTION public.verify_email_otp(_email text, _code text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE rec RECORD; v_email text := lower(trim(_email)); v_code text := trim(_code);
BEGIN
  SELECT * INTO rec FROM public.email_verification_codes
   WHERE lower(email) = v_email AND verified_at IS NULL
   ORDER BY created_at DESC LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'no_code'); END IF;
  IF rec.expires_at < now() THEN RETURN jsonb_build_object('success', false, 'error', 'expired'); END IF;
  IF COALESCE(rec.attempts,0) >= 5 THEN RETURN jsonb_build_object('success', false, 'error', 'too_many_attempts'); END IF;
  IF rec.code = extensions.crypt(v_code, rec.code) THEN
    UPDATE public.email_verification_codes SET verified_at = now() WHERE id = rec.id;
    RETURN jsonb_build_object('success', true);
  END IF;
  UPDATE public.email_verification_codes SET attempts = COALESCE(attempts,0) + 1 WHERE id = rec.id;
  RETURN jsonb_build_object('success', false, 'error', 'invalid', 'attempts_left', GREATEST(0, 5 - (COALESCE(rec.attempts,0)+1)));
END;
$function$;

CREATE OR REPLACE FUNCTION public.verify_2fa_code(_email text, _phone text, _code text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE rec RECORD; v_code text := trim(_code);
BEGIN
  SELECT * INTO rec FROM public.verification_codes
   WHERE (email IS NOT NULL AND lower(email) = lower(trim(_email)))
      OR (phone IS NOT NULL AND phone = trim(_phone))
   ORDER BY created_at DESC LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'no_code'); END IF;
  IF rec.expires_at < now() THEN RETURN jsonb_build_object('success', false, 'error', 'expired'); END IF;
  IF rec.code = extensions.crypt(v_code, rec.code) THEN
    UPDATE public.verification_codes SET verified_at = now() WHERE id = rec.id;
    RETURN jsonb_build_object('success', true);
  END IF;
  RETURN jsonb_build_object('success', false, 'error', 'invalid');
END;
$function$;

CREATE OR REPLACE FUNCTION public.verify_withdrawal_otp(_id uuid, _code text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE rec RECORD; v_code text := trim(_code);
BEGIN
  SELECT * INTO rec FROM public.withdrawal_verification_codes
   WHERE user_id = _id AND used_at IS NULL
   ORDER BY created_at DESC LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'no_code'); END IF;
  IF rec.expires_at < now() THEN RETURN jsonb_build_object('success', false, 'error', 'expired'); END IF;
  IF rec.verification_code = extensions.crypt(v_code, rec.verification_code) THEN
    UPDATE public.withdrawal_verification_codes SET used_at = now() WHERE id = rec.id;
    RETURN jsonb_build_object('success', true);
  END IF;
  RETURN jsonb_build_object('success', false, 'error', 'invalid');
END;
$function$;

CREATE FUNCTION public.verify_login_otp(_user_id uuid, _code text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE rec RECORD; v_code text := trim(_code);
BEGIN
  SELECT * INTO rec FROM public.login_verification_codes
   WHERE user_id = _user_id AND verified = false
   ORDER BY created_at DESC LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'no_code'); END IF;
  IF rec.expires_at < now() THEN RETURN jsonb_build_object('success', false, 'error', 'expired'); END IF;
  IF rec.verification_code = extensions.crypt(v_code, rec.verification_code) THEN
    UPDATE public.login_verification_codes SET verified = true WHERE id = rec.id;
    RETURN jsonb_build_object('success', true);
  END IF;
  UPDATE public.login_verification_codes SET attempts = COALESCE(attempts,0)+1 WHERE id = rec.id;
  RETURN jsonb_build_object('success', false, 'error', 'invalid');
END;
$function$;

CREATE FUNCTION public.verify_admin_withdrawal_pin(_id uuid, _pin text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE rec RECORD; v_pin text := trim(_pin);
BEGIN
  SELECT * INTO rec FROM public.admin_initiated_withdrawals WHERE id = _id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'not_found'); END IF;
  IF rec.status <> 'pending_pin' THEN RETURN jsonb_build_object('success', false, 'error', 'invalid_status'); END IF;
  IF rec.pin_expires_at IS NOT NULL AND rec.pin_expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'expired');
  END IF;
  IF rec.pin_code = extensions.crypt(v_pin, rec.pin_code) THEN
    RETURN jsonb_build_object('success', true);
  END IF;
  RETURN jsonb_build_object('success', false, 'error', 'invalid');
END;
$function$;

REVOKE ALL ON FUNCTION public.verify_login_otp(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.verify_login_otp(uuid, text) TO authenticated, anon;
REVOKE ALL ON FUNCTION public.verify_admin_withdrawal_pin(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.verify_admin_withdrawal_pin(uuid, text) TO authenticated;

UPDATE public.email_verification_codes SET attempts = 0 WHERE verified_at IS NULL;
UPDATE public.login_verification_codes SET attempts = 0 WHERE verified = false;