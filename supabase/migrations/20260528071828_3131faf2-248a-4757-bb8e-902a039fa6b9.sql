
-- ============================================================
-- 1) user_fraud_locks: lock down SELECT, hash unlock_code, add RPCs
-- ============================================================

-- Restrict SELECT to admins only (remove owner read of unlock_code)
DROP POLICY IF EXISTS "Users can view own fraud locks" ON public.user_fraud_locks;

DROP POLICY IF EXISTS "Admins can view fraud locks" ON public.user_fraud_locks;
CREATE POLICY "Admins can view fraud locks"
  ON public.user_fraud_locks
  FOR SELECT
  TO authenticated
  USING (public.is_current_user_admin());

-- Hash unlock_code on insert/update using bcrypt
CREATE OR REPLACE FUNCTION public.hash_fraud_unlock_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NEW.unlock_code IS NOT NULL AND NEW.unlock_code !~ '^\$2[aby]\$' THEN
    NEW.unlock_code := crypt(NEW.unlock_code, gen_salt('bf'));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hash_fraud_unlock_code ON public.user_fraud_locks;
CREATE TRIGGER trg_hash_fraud_unlock_code
  BEFORE INSERT OR UPDATE OF unlock_code ON public.user_fraud_locks
  FOR EACH ROW EXECUTE FUNCTION public.hash_fraud_unlock_code();

-- Migrate existing plaintext codes -> bcrypt
UPDATE public.user_fraud_locks
SET unlock_code = crypt(unlock_code, gen_salt('bf'))
WHERE unlock_code IS NOT NULL AND unlock_code !~ '^\$2[aby]\$';

-- RPC: let the locked user check their own status without exposing unlock_code
CREATE OR REPLACE FUNCTION public.get_my_fraud_lock()
RETURNS TABLE(id uuid, user_name text, is_locked boolean, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT l.id, l.user_name, l.is_locked, l.created_at
  FROM public.user_fraud_locks l
  WHERE l.user_id = auth.uid()
    AND l.is_locked = true
  ORDER BY l.created_at DESC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_fraud_lock() TO authenticated;

-- RPC: verify unlock code & lift lock (no plaintext leaks to client)
CREATE OR REPLACE FUNCTION public.verify_fraud_unlock_code(_lock_id uuid, _code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  rec record;
BEGIN
  IF _code IS NULL OR length(trim(_code)) = 0 THEN
    RETURN false;
  END IF;

  SELECT id, unlock_code, user_id, is_locked
    INTO rec
    FROM public.user_fraud_locks
   WHERE id = _lock_id
     AND user_id = auth.uid()
     AND is_locked = true
   LIMIT 1;

  IF rec IS NULL OR rec.unlock_code IS NULL THEN
    RETURN false;
  END IF;

  IF rec.unlock_code <> crypt(trim(_code), rec.unlock_code) THEN
    RETURN false;
  END IF;

  UPDATE public.user_fraud_locks
     SET is_locked = false,
         unlocked_at = now(),
         unlocked_by = 'self_unlock_code'
   WHERE id = rec.id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_fraud_unlock_code(uuid, text) TO authenticated;

-- ============================================================
-- 2) verification_audit_logs: stop persisting raw codes
-- ============================================================

CREATE OR REPLACE FUNCTION public.hash_verification_audit_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NEW.code IS NOT NULL AND length(NEW.code) > 0 AND NEW.code !~ '^sha256:' THEN
    NEW.code := 'sha256:' || encode(digest(NEW.code, 'sha256'), 'hex');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hash_verification_audit_code ON public.verification_audit_logs;
CREATE TRIGGER trg_hash_verification_audit_code
  BEFORE INSERT OR UPDATE OF code ON public.verification_audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.hash_verification_audit_code();

-- Hash any existing raw codes
UPDATE public.verification_audit_logs
SET code = 'sha256:' || encode(digest(code, 'sha256'), 'hex')
WHERE code IS NOT NULL AND length(code) > 0 AND code !~ '^sha256:';
