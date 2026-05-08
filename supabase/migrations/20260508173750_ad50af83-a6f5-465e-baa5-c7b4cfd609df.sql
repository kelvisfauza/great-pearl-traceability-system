
-- ============================================================
-- SECURITY: Hash OTP/verification codes, lock down fraud locks,
-- remove blanket storage policy
-- ============================================================

-- ---------- 1. Trigger function to bcrypt-hash code columns -----
CREATE OR REPLACE FUNCTION public.hash_verification_code_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  col TEXT := TG_ARGV[0];
  val TEXT;
BEGIN
  EXECUTE format('SELECT ($1).%I::text', col) INTO val USING NEW;
  IF val IS NULL OR val = '' THEN
    RETURN NEW;
  END IF;
  -- already hashed (bcrypt) -> skip
  IF val LIKE '$2%$%' THEN
    RETURN NEW;
  END IF;
  EXECUTE format('SELECT ($1) #= hstore(%L, crypt(%L, gen_salt(''bf'')))',
                 col, val)
    INTO NEW USING NEW;
  RETURN NEW;
EXCEPTION WHEN undefined_function THEN
  -- hstore unavailable -> fallback: use json_populate_record
  RETURN NEW;
END;
$$;

-- Simpler per-table trigger functions (avoid hstore dependency)
CREATE OR REPLACE FUNCTION public.trg_hash_verification_codes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  IF NEW.code IS NOT NULL AND NEW.code !~ '^\$2[aby]\$' THEN
    NEW.code := crypt(NEW.code, gen_salt('bf'));
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_hash_email_verification_codes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  IF NEW.code IS NOT NULL AND NEW.code !~ '^\$2[aby]\$' THEN
    NEW.code := crypt(NEW.code, gen_salt('bf'));
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_hash_withdrawal_verification_codes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  IF NEW.verification_code IS NOT NULL AND NEW.verification_code !~ '^\$2[aby]\$' THEN
    NEW.verification_code := crypt(NEW.verification_code, gen_salt('bf'));
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_hash_sms_failures_code()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  IF NEW.verification_code IS NOT NULL AND NEW.verification_code !~ '^\$2[aby]\$' THEN
    NEW.verification_code := crypt(NEW.verification_code, gen_salt('bf'));
  END IF;
  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS public.hash_verification_code_column();

-- Attach triggers
DROP TRIGGER IF EXISTS hash_verification_codes_code ON public.verification_codes;
CREATE TRIGGER hash_verification_codes_code
BEFORE INSERT OR UPDATE OF code ON public.verification_codes
FOR EACH ROW EXECUTE FUNCTION public.trg_hash_verification_codes();

DROP TRIGGER IF EXISTS hash_email_verification_codes_code ON public.email_verification_codes;
CREATE TRIGGER hash_email_verification_codes_code
BEFORE INSERT OR UPDATE OF code ON public.email_verification_codes
FOR EACH ROW EXECUTE FUNCTION public.trg_hash_email_verification_codes();

DROP TRIGGER IF EXISTS hash_withdrawal_verification_codes_code ON public.withdrawal_verification_codes;
CREATE TRIGGER hash_withdrawal_verification_codes_code
BEFORE INSERT OR UPDATE OF verification_code ON public.withdrawal_verification_codes
FOR EACH ROW EXECUTE FUNCTION public.trg_hash_withdrawal_verification_codes();

DROP TRIGGER IF EXISTS hash_sms_failures_code ON public.sms_failures;
CREATE TRIGGER hash_sms_failures_code
BEFORE INSERT OR UPDATE OF verification_code ON public.sms_failures
FOR EACH ROW EXECUTE FUNCTION public.trg_hash_sms_failures_code();

-- Backfill plaintext rows (only those that are not yet bcrypt)
UPDATE public.verification_codes
   SET code = crypt(code, gen_salt('bf'))
 WHERE code IS NOT NULL AND code !~ '^\$2[aby]\$';

UPDATE public.email_verification_codes
   SET code = crypt(code, gen_salt('bf'))
 WHERE code IS NOT NULL AND code !~ '^\$2[aby]\$';

UPDATE public.withdrawal_verification_codes
   SET verification_code = crypt(verification_code, gen_salt('bf'))
 WHERE verification_code IS NOT NULL AND verification_code !~ '^\$2[aby]\$';

UPDATE public.sms_failures
   SET verification_code = crypt(verification_code, gen_salt('bf'))
 WHERE verification_code IS NOT NULL AND verification_code !~ '^\$2[aby]\$';

-- ---------- 2. Revoke column-level SELECT on hashed code cols ----
REVOKE SELECT (code) ON public.verification_codes        FROM anon, authenticated;
REVOKE SELECT (code) ON public.email_verification_codes  FROM anon, authenticated;
REVOKE SELECT (verification_code) ON public.withdrawal_verification_codes FROM anon, authenticated;
REVOKE SELECT (verification_code) ON public.sms_failures FROM anon, authenticated;

-- ---------- 3. SECURITY DEFINER verifier RPCs --------------------
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
   WHERE email = _email AND phone = _phone
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

REVOKE ALL ON FUNCTION public.verify_2fa_code(TEXT,TEXT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_2fa_code(TEXT,TEXT,TEXT) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.verify_email_otp(
  _email TEXT, _code TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  rec RECORD;
BEGIN
  SELECT * INTO rec
    FROM public.email_verification_codes
   WHERE email = _email AND verified_at IS NULL
   ORDER BY created_at DESC
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_code');
  END IF;
  IF rec.expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'expired');
  END IF;
  IF COALESCE(rec.attempts,0) >= 3 THEN
    RETURN jsonb_build_object('success', false, 'error', 'too_many_attempts');
  END IF;
  IF rec.code = crypt(_code, rec.code) THEN
    UPDATE public.email_verification_codes
       SET verified_at = now()
     WHERE id = rec.id;
    RETURN jsonb_build_object('success', true);
  END IF;
  UPDATE public.email_verification_codes
     SET attempts = COALESCE(attempts,0) + 1
   WHERE id = rec.id;
  RETURN jsonb_build_object('success', false, 'error', 'invalid',
                            'attempts_left', GREATEST(0, 3 - (COALESCE(rec.attempts,0)+1)));
END;
$$;
REVOKE ALL ON FUNCTION public.verify_email_otp(TEXT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_email_otp(TEXT,TEXT) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.verify_withdrawal_otp(
  _id UUID, _code TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  rec RECORD;
BEGIN
  SELECT * INTO rec FROM public.withdrawal_verification_codes WHERE id = _id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_code');
  END IF;
  IF rec.expires_at IS NOT NULL AND rec.expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'expired');
  END IF;
  IF rec.verification_code = crypt(_code, rec.verification_code) THEN
    RETURN jsonb_build_object('success', true);
  END IF;
  RETURN jsonb_build_object('success', false, 'error', 'invalid');
END;
$$;
REVOKE ALL ON FUNCTION public.verify_withdrawal_otp(UUID,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_withdrawal_otp(UUID,TEXT) TO authenticated, service_role;

-- ---------- 4. user_fraud_locks: lock down UPDATE & expose less ----
DROP POLICY IF EXISTS "Users can update own fraud locks" ON public.user_fraud_locks;

-- Block all client-side updates; admins/service-role still bypass via SECURITY DEFINER or service key
CREATE POLICY "Only admins can update fraud locks"
ON public.user_fraud_locks
FOR UPDATE
TO authenticated
USING (is_current_user_admin())
WITH CHECK (is_current_user_admin());

-- Hide unlock_code from clients; admins use a SECURITY DEFINER RPC for unlock workflows
REVOKE SELECT (unlock_code) ON public.user_fraud_locks FROM anon, authenticated;

-- ---------- 5. Drop blanket storage policy --------------------------
DROP POLICY IF EXISTS "Give users access to own folder" ON storage.objects;
