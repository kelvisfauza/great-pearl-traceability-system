
-- 1. Verification RPC for admin-initiated withdrawal PIN
CREATE OR REPLACE FUNCTION public.verify_admin_withdrawal_pin(_id uuid, _pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hash text;
  v_email text;
  v_status text;
  v_expires timestamptz;
BEGIN
  SELECT pin_code, employee_email, status, pin_expires_at
    INTO v_hash, v_email, v_status, v_expires
  FROM public.admin_initiated_withdrawals
  WHERE id = _id;

  IF v_hash IS NULL THEN RETURN false; END IF;
  IF v_status <> 'pending_pin' THEN RETURN false; END IF;
  IF v_expires < now() THEN RETURN false; END IF;

  -- Caller must be the employee whose wallet is being debited
  IF lower(coalesce((auth.jwt() ->> 'email'), '')) <> lower(v_email) THEN
    RETURN false;
  END IF;

  RETURN crypt(_pin, v_hash) = v_hash;
END;
$$;

REVOKE ALL ON FUNCTION public.verify_admin_withdrawal_pin(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.verify_admin_withdrawal_pin(uuid, text) TO authenticated;

-- 2. Hash login OTP codes at write time
CREATE OR REPLACE FUNCTION public.hash_login_verification_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.verification_code IS NOT NULL AND NEW.verification_code !~ '^\$2[aby]\$' THEN
    NEW.verification_code := crypt(NEW.verification_code, gen_salt('bf'));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hash_login_verification_code ON public.login_verification_codes;
CREATE TRIGGER trg_hash_login_verification_code
BEFORE INSERT OR UPDATE OF verification_code ON public.login_verification_codes
FOR EACH ROW EXECUTE FUNCTION public.hash_login_verification_code();

-- Hash any existing plaintext rows
UPDATE public.login_verification_codes
SET verification_code = crypt(verification_code, gen_salt('bf'))
WHERE verification_code IS NOT NULL
  AND verification_code !~ '^\$2[aby]\$';

-- Remove the policy that lets users read their own OTP code from the DB
DROP POLICY IF EXISTS "Users read own verification code" ON public.login_verification_codes;

-- Verifier RPC for the OTP (compares against bcrypt hash)
CREATE OR REPLACE FUNCTION public.verify_login_otp(_user_id uuid, _code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hash text;
  v_expires timestamptz;
  v_verified boolean;
BEGIN
  SELECT verification_code, expires_at, verified
    INTO v_hash, v_expires, v_verified
  FROM public.login_verification_codes
  WHERE user_id = _user_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_hash IS NULL OR v_verified OR v_expires < now() THEN
    RETURN false;
  END IF;

  IF crypt(_code, v_hash) = v_hash THEN
    UPDATE public.login_verification_codes
    SET verified = true
    WHERE user_id = _user_id AND verification_code = v_hash;
    RETURN true;
  END IF;

  UPDATE public.login_verification_codes
  SET attempts = COALESCE(attempts, 0) + 1
  WHERE user_id = _user_id AND verification_code = v_hash;

  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.verify_login_otp(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.verify_login_otp(uuid, text) TO authenticated, anon;
