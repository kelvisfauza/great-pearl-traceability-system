CREATE OR REPLACE FUNCTION public.verify_and_deactivate_maintenance(_code text, _pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec record;
  code_ok boolean := false;
  pin_ok boolean := false;
BEGIN
  SELECT id, recovery_key, recovery_pin
    INTO rec
    FROM public.system_maintenance
    LIMIT 1;

  IF rec IS NULL OR rec.recovery_key IS NULL OR rec.recovery_pin IS NULL THEN
    RETURN false;
  END IF;

  -- Hashed (bcrypt) comparison or legacy plaintext fallback
  IF rec.recovery_key ~ '^\$2[aby]\$' THEN
    code_ok := rec.recovery_key = crypt(_code, rec.recovery_key);
  ELSE
    code_ok := rec.recovery_key = _code;
  END IF;

  IF rec.recovery_pin ~ '^\$2[aby]\$' THEN
    pin_ok := rec.recovery_pin = crypt(_pin, rec.recovery_pin);
  ELSE
    pin_ok := rec.recovery_pin = _pin;
  END IF;

  IF NOT (code_ok AND pin_ok) THEN
    RETURN false;
  END IF;

  UPDATE public.system_maintenance
     SET is_active = false,
         reason = NULL,
         activated_by = NULL,
         activated_at = NULL,
         recovery_key = NULL,
         recovery_pin = NULL,
         expected_back_online = NULL
   WHERE id = rec.id;

  RETURN true;
END;
$$;