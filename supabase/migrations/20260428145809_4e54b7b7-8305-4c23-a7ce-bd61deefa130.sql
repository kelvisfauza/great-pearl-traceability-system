
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- =========================================================
-- 1. Codes aggregator (was in earlier file that didn't run)
-- =========================================================
CREATE OR REPLACE FUNCTION public.get_all_active_codes(_lookup text)
RETURNS TABLE(
  code text,
  recipient_email text,
  category text,
  label text,
  created_at timestamptz,
  expires_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH emp AS (
    SELECT lower(e.email) AS email
    FROM public.employees e
    WHERE (e.id::text = _lookup OR e.employee_id = _lookup)
      AND e.email IS NOT NULL
      AND COALESCE(e.disabled, false) = false
    LIMIT 1
  )
  SELECT v.code, v.email,
         'login'::text, 'Login Code'::text,
         v.created_at, v.expires_at
  FROM public.email_verification_codes v
  JOIN emp ON lower(v.email) = emp.email
  WHERE v.expires_at > now() AND v.verified_at IS NULL
  UNION ALL
  SELECT vc.code, vc.email,
         'verification'::text, 'Verification Code'::text,
         vc.created_at, vc.expires_at
  FROM public.verification_codes vc
  JOIN emp ON lower(vc.email) = emp.email
  WHERE vc.expires_at > now()
  UNION ALL
  SELECT wvc.verification_code, wvc.approver_email,
         'withdrawal'::text, 'Withdrawal Approval Code'::text,
         wvc.created_at, wvc.code_expires_at
  FROM public.withdrawal_verification_codes wvc
  JOIN emp ON lower(wvc.approver_email) = emp.email
  WHERE wvc.code_expires_at > now() AND COALESCE(wvc.verified, false) = false
  ORDER BY 5 DESC;
$$;

-- =========================================================
-- 2. PIN + device tables
-- =========================================================
CREATE TABLE IF NOT EXISTS public.qr_access_pins (
  employee_id uuid PRIMARY KEY REFERENCES public.employees(id) ON DELETE CASCADE,
  pin_hash text NOT NULL,
  failed_attempts int NOT NULL DEFAULT 0,
  locked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.qr_trusted_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  device_token_hash text NOT NULL UNIQUE,
  device_label text,
  last_used_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS qr_trusted_devices_emp_idx ON public.qr_trusted_devices(employee_id);

CREATE TABLE IF NOT EXISTS public.qr_access_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  purpose text NOT NULL CHECK (purpose IN ('setup_pin','enroll_device')),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  attempts int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS qr_access_otps_emp_idx ON public.qr_access_otps(employee_id, expires_at DESC);

ALTER TABLE public.qr_access_pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_trusted_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_access_otps ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- 3. Helpers
-- =========================================================
CREATE OR REPLACE FUNCTION public._qr_hash(_value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public, extensions
AS $$ SELECT encode(extensions.digest('qr-access:' || _value, 'sha256'), 'hex'); $$;

CREATE OR REPLACE FUNCTION public._qr_lookup_employee(_lookup text)
RETURNS public.employees
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.* FROM public.employees e
  WHERE (e.id::text = _lookup OR e.employee_id = _lookup)
    AND e.email IS NOT NULL
    AND COALESCE(e.disabled, false) = false
  LIMIT 1;
$$;

-- =========================================================
-- 4. RPCs
-- =========================================================
CREATE OR REPLACE FUNCTION public.qr_access_status(_lookup text, _device_token text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE emp public.employees; has_pin boolean; trusted boolean := false; pin_row public.qr_access_pins;
BEGIN
  emp := public._qr_lookup_employee(_lookup);
  IF emp.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'employee_not_found'); END IF;
  SELECT * INTO pin_row FROM public.qr_access_pins WHERE employee_id = emp.id;
  has_pin := pin_row.employee_id IS NOT NULL;
  IF _device_token IS NOT NULL AND _device_token <> '' THEN
    SELECT EXISTS(SELECT 1 FROM public.qr_trusted_devices
      WHERE employee_id = emp.id AND device_token_hash = public._qr_hash(_device_token)) INTO trusted;
  END IF;
  RETURN jsonb_build_object(
    'ok', true, 'employee_id', emp.id, 'has_pin', has_pin, 'device_trusted', trusted,
    'locked_until', pin_row.locked_until,
    'email_masked', regexp_replace(emp.email, '(^.).*(@.*$)', '\1***\2')
  );
END; $$;

CREATE OR REPLACE FUNCTION public.qr_access_request_otp(_lookup text, _purpose text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE emp public.employees; code text;
BEGIN
  IF _purpose NOT IN ('setup_pin','enroll_device') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_purpose'); END IF;
  emp := public._qr_lookup_employee(_lookup);
  IF emp.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'employee_not_found'); END IF;
  code := lpad((floor(random() * 1000000))::int::text, 6, '0');
  INSERT INTO public.qr_access_otps(employee_id, code_hash, purpose, expires_at)
  VALUES (emp.id, public._qr_hash(code), _purpose, now() + interval '10 minutes');
  RETURN jsonb_build_object('ok', true, 'employee_id', emp.id,
    'email', emp.email, 'name', emp.name, 'code', code);
END; $$;

CREATE OR REPLACE FUNCTION public.qr_access_set_pin(_lookup text, _otp text, _new_pin text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
DECLARE emp public.employees; otp_row public.qr_access_otps; device_token text;
BEGIN
  IF _new_pin !~ '^[0-9]{4}$' THEN RETURN jsonb_build_object('ok', false, 'error', 'invalid_pin_format'); END IF;
  IF _otp !~ '^[0-9]{6}$' THEN RETURN jsonb_build_object('ok', false, 'error', 'invalid_otp_format'); END IF;
  emp := public._qr_lookup_employee(_lookup);
  IF emp.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'employee_not_found'); END IF;
  SELECT * INTO otp_row FROM public.qr_access_otps
  WHERE employee_id = emp.id AND purpose = 'setup_pin' AND consumed_at IS NULL
    AND expires_at > now() AND code_hash = public._qr_hash(_otp)
  ORDER BY created_at DESC LIMIT 1;
  IF otp_row.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'invalid_or_expired_otp'); END IF;
  UPDATE public.qr_access_otps SET consumed_at = now() WHERE id = otp_row.id;
  INSERT INTO public.qr_access_pins(employee_id, pin_hash, failed_attempts, locked_until, updated_at)
  VALUES (emp.id, public._qr_hash(_new_pin), 0, NULL, now())
  ON CONFLICT (employee_id) DO UPDATE
    SET pin_hash = EXCLUDED.pin_hash, failed_attempts = 0, locked_until = NULL, updated_at = now();
  device_token := encode(extensions.gen_random_bytes(32), 'hex');
  INSERT INTO public.qr_trusted_devices(employee_id, device_token_hash, device_label)
  VALUES (emp.id, public._qr_hash(device_token), 'Setup device');
  RETURN jsonb_build_object('ok', true, 'device_token', device_token);
END; $$;

CREATE OR REPLACE FUNCTION public.qr_access_enroll_device(_lookup text, _otp text, _pin text, _device_label text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
DECLARE emp public.employees; pin_row public.qr_access_pins; otp_row public.qr_access_otps; device_token text;
BEGIN
  emp := public._qr_lookup_employee(_lookup);
  IF emp.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'employee_not_found'); END IF;
  SELECT * INTO pin_row FROM public.qr_access_pins WHERE employee_id = emp.id;
  IF pin_row.employee_id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'pin_not_set'); END IF;
  IF pin_row.locked_until IS NOT NULL AND pin_row.locked_until > now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'locked', 'locked_until', pin_row.locked_until); END IF;
  IF pin_row.pin_hash <> public._qr_hash(_pin) THEN
    UPDATE public.qr_access_pins
       SET failed_attempts = failed_attempts + 1,
           locked_until = CASE WHEN failed_attempts + 1 >= 5 THEN now() + interval '15 minutes' ELSE NULL END,
           updated_at = now()
     WHERE employee_id = emp.id;
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_pin');
  END IF;
  SELECT * INTO otp_row FROM public.qr_access_otps
  WHERE employee_id = emp.id AND purpose = 'enroll_device' AND consumed_at IS NULL
    AND expires_at > now() AND code_hash = public._qr_hash(_otp)
  ORDER BY created_at DESC LIMIT 1;
  IF otp_row.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'invalid_or_expired_otp'); END IF;
  UPDATE public.qr_access_otps SET consumed_at = now() WHERE id = otp_row.id;
  UPDATE public.qr_access_pins SET failed_attempts = 0, locked_until = NULL, updated_at = now() WHERE employee_id = emp.id;
  device_token := encode(extensions.gen_random_bytes(32), 'hex');
  INSERT INTO public.qr_trusted_devices(employee_id, device_token_hash, device_label)
  VALUES (emp.id, public._qr_hash(device_token), COALESCE(_device_label, 'New device'));
  RETURN jsonb_build_object('ok', true, 'device_token', device_token);
END; $$;

CREATE OR REPLACE FUNCTION public.qr_access_verify_pin(_lookup text, _device_token text, _pin text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE emp public.employees; pin_row public.qr_access_pins; trusted boolean;
BEGIN
  IF _pin !~ '^[0-9]{4}$' THEN RETURN jsonb_build_object('ok', false, 'error', 'invalid_pin_format'); END IF;
  emp := public._qr_lookup_employee(_lookup);
  IF emp.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'employee_not_found'); END IF;
  SELECT EXISTS(SELECT 1 FROM public.qr_trusted_devices
    WHERE employee_id = emp.id AND device_token_hash = public._qr_hash(_device_token)) INTO trusted;
  IF NOT trusted THEN RETURN jsonb_build_object('ok', false, 'error', 'device_not_trusted'); END IF;
  SELECT * INTO pin_row FROM public.qr_access_pins WHERE employee_id = emp.id;
  IF pin_row.employee_id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'pin_not_set'); END IF;
  IF pin_row.locked_until IS NOT NULL AND pin_row.locked_until > now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'locked', 'locked_until', pin_row.locked_until); END IF;
  IF pin_row.pin_hash <> public._qr_hash(_pin) THEN
    UPDATE public.qr_access_pins
       SET failed_attempts = failed_attempts + 1,
           locked_until = CASE WHEN failed_attempts + 1 >= 5 THEN now() + interval '15 minutes' ELSE NULL END,
           updated_at = now()
     WHERE employee_id = emp.id;
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_pin');
  END IF;
  UPDATE public.qr_access_pins SET failed_attempts = 0, locked_until = NULL, updated_at = now() WHERE employee_id = emp.id;
  UPDATE public.qr_trusted_devices SET last_used_at = now()
   WHERE employee_id = emp.id AND device_token_hash = public._qr_hash(_device_token);
  RETURN jsonb_build_object('ok', true);
END; $$;

REVOKE EXECUTE ON FUNCTION public.get_latest_login_code(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_all_active_codes(text) FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.qr_access_get_codes(_lookup text, _device_token text, _pin text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE verify jsonb; rows jsonb;
BEGIN
  verify := public.qr_access_verify_pin(_lookup, _device_token, _pin);
  IF NOT (verify->>'ok')::boolean THEN RETURN verify; END IF;
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO rows
  FROM public.get_all_active_codes(_lookup) t;
  RETURN jsonb_build_object('ok', true, 'codes', rows);
END; $$;

GRANT EXECUTE ON FUNCTION public.qr_access_status(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.qr_access_request_otp(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.qr_access_set_pin(text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.qr_access_enroll_device(text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.qr_access_verify_pin(text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.qr_access_get_codes(text, text, text) TO anon, authenticated;
