
CREATE OR REPLACE FUNCTION public.verify_2fa_code(
  _email TEXT, _phone TEXT, _code TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  rec RECORD;
BEGIN
  SELECT * INTO rec
    FROM public.verification_codes
   WHERE email = _email
     AND (_phone IS NULL OR _phone = '' OR phone = _phone)
   ORDER BY created_at DESC
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_code');
  END IF;
  IF rec.expires_at < now() THEN
    DELETE FROM public.verification_codes WHERE id = rec.id;
    RETURN jsonb_build_object('success', false, 'error', 'expired');
  END IF;
  IF COALESCE(rec.attempts, 0) >= 3 THEN
    DELETE FROM public.verification_codes WHERE id = rec.id;
    RETURN jsonb_build_object('success', false, 'error', 'too_many_attempts');
  END IF;
  IF rec.code = crypt(_code, rec.code) THEN
    DELETE FROM public.verification_codes WHERE id = rec.id;
    RETURN jsonb_build_object('success', true);
  END IF;
  UPDATE public.verification_codes
     SET attempts = COALESCE(attempts,0) + 1
   WHERE id = rec.id;
  RETURN jsonb_build_object('success', false, 'error', 'invalid',
                            'attempts_left', GREATEST(0, 3 - (COALESCE(rec.attempts,0)+1)));
END;
$$;
