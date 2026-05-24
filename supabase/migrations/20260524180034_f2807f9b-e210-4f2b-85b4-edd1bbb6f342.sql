
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

ALTER TABLE public.sms_failures ALTER COLUMN verification_code DROP NOT NULL;

-- verification_codes.code
CREATE OR REPLACE FUNCTION public.hash_verification_codes_code()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions' AS $$
BEGIN
  IF NEW.code IS NOT NULL AND length(NEW.code) > 0
     AND NEW.code NOT LIKE '$2a$%' AND NEW.code NOT LIKE '$2b$%' AND NEW.code NOT LIKE '$2y$%' THEN
    NEW.code := extensions.crypt(NEW.code, extensions.gen_salt('bf', 10));
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_hash_verification_codes_code ON public.verification_codes;
CREATE TRIGGER trg_hash_verification_codes_code
  BEFORE INSERT OR UPDATE OF code ON public.verification_codes
  FOR EACH ROW EXECUTE FUNCTION public.hash_verification_codes_code();

-- email_verification_codes.code
CREATE OR REPLACE FUNCTION public.hash_email_verification_codes_code()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions' AS $$
BEGIN
  IF NEW.code IS NOT NULL AND length(NEW.code) > 0
     AND NEW.code NOT LIKE '$2a$%' AND NEW.code NOT LIKE '$2b$%' AND NEW.code NOT LIKE '$2y$%' THEN
    NEW.code := extensions.crypt(NEW.code, extensions.gen_salt('bf', 10));
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_hash_email_verification_codes_code ON public.email_verification_codes;
CREATE TRIGGER trg_hash_email_verification_codes_code
  BEFORE INSERT OR UPDATE OF code ON public.email_verification_codes
  FOR EACH ROW EXECUTE FUNCTION public.hash_email_verification_codes_code();

-- login_verification_codes.verification_code
CREATE OR REPLACE FUNCTION public.hash_login_verification_codes_code()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions' AS $$
BEGIN
  IF NEW.verification_code IS NOT NULL AND length(NEW.verification_code) > 0
     AND NEW.verification_code NOT LIKE '$2a$%' AND NEW.verification_code NOT LIKE '$2b$%' AND NEW.verification_code NOT LIKE '$2y$%' THEN
    NEW.verification_code := extensions.crypt(NEW.verification_code, extensions.gen_salt('bf', 10));
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_hash_login_verification_codes_code ON public.login_verification_codes;
CREATE TRIGGER trg_hash_login_verification_codes_code
  BEFORE INSERT OR UPDATE OF verification_code ON public.login_verification_codes
  FOR EACH ROW EXECUTE FUNCTION public.hash_login_verification_codes_code();

-- admin_initiated_withdrawals.pin_code
CREATE OR REPLACE FUNCTION public.hash_admin_withdrawal_pin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions' AS $$
BEGIN
  IF NEW.pin_code IS NOT NULL AND length(NEW.pin_code) > 0
     AND NEW.pin_code NOT LIKE '$2a$%' AND NEW.pin_code NOT LIKE '$2b$%' AND NEW.pin_code NOT LIKE '$2y$%' THEN
    NEW.pin_code := extensions.crypt(NEW.pin_code, extensions.gen_salt('bf', 10));
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_hash_admin_withdrawal_pin ON public.admin_initiated_withdrawals;
CREATE TRIGGER trg_hash_admin_withdrawal_pin
  BEFORE INSERT OR UPDATE OF pin_code ON public.admin_initiated_withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.hash_admin_withdrawal_pin();

-- sms_failures: strip plaintext code
CREATE OR REPLACE FUNCTION public.strip_sms_failures_code()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  NEW.verification_code := NULL;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_strip_sms_failures_code ON public.sms_failures;
CREATE TRIGGER trg_strip_sms_failures_code
  BEFORE INSERT OR UPDATE ON public.sms_failures
  FOR EACH ROW EXECUTE FUNCTION public.strip_sms_failures_code();

-- Backfill: hash any existing plaintext
UPDATE public.verification_codes
  SET code = extensions.crypt(code, extensions.gen_salt('bf', 10))
  WHERE code IS NOT NULL
    AND code NOT LIKE '$2a$%' AND code NOT LIKE '$2b$%' AND code NOT LIKE '$2y$%';

UPDATE public.email_verification_codes
  SET code = extensions.crypt(code, extensions.gen_salt('bf', 10))
  WHERE code IS NOT NULL
    AND code NOT LIKE '$2a$%' AND code NOT LIKE '$2b$%' AND code NOT LIKE '$2y$%';

UPDATE public.login_verification_codes
  SET verification_code = extensions.crypt(verification_code, extensions.gen_salt('bf', 10))
  WHERE verification_code IS NOT NULL
    AND verification_code NOT LIKE '$2a$%' AND verification_code NOT LIKE '$2b$%' AND verification_code NOT LIKE '$2y$%';

UPDATE public.admin_initiated_withdrawals
  SET pin_code = extensions.crypt(pin_code, extensions.gen_salt('bf', 10))
  WHERE pin_code IS NOT NULL
    AND status = 'pending_pin'
    AND pin_code NOT LIKE '$2a$%' AND pin_code NOT LIKE '$2b$%' AND pin_code NOT LIKE '$2y$%';

UPDATE public.sms_failures SET verification_code = NULL WHERE verification_code IS NOT NULL;
