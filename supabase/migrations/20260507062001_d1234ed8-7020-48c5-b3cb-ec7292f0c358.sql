CREATE OR REPLACE FUNCTION public.get_maintenance_status()
RETURNS TABLE(is_active boolean, reason text, expected_back_online timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sm.is_active, sm.reason, sm.expected_back_online
  FROM public.system_maintenance sm
  ORDER BY sm.is_active DESC, sm.updated_at DESC, sm.created_at DESC
  LIMIT 1;
$$;

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
   WHERE is_active = true
   ORDER BY updated_at DESC, created_at DESC
   LIMIT 1;

  IF rec IS NULL THEN
    SELECT id, recovery_key, recovery_pin
      INTO rec
      FROM public.system_maintenance
     WHERE recovery_key IS NOT NULL
       AND recovery_pin IS NOT NULL
     ORDER BY updated_at DESC, created_at DESC
     LIMIT 1;
  END IF;

  IF rec IS NULL OR rec.recovery_key IS NULL OR rec.recovery_pin IS NULL THEN
    RETURN false;
  END IF;

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