
-- 1. market_intelligence_reports: authenticated only
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies
           WHERE schemaname='public' AND tablename='market_intelligence_reports' AND cmd='SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.market_intelligence_reports', r.policyname);
  END LOOP;
END $$;

CREATE POLICY "Authenticated users can read market intelligence reports"
  ON public.market_intelligence_reports FOR SELECT TO authenticated
  USING (true);

-- 2. Block privilege escalation via employees UPDATE
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_caller_is_super_admin boolean;
BEGIN
  -- Allow if role/permissions/department unchanged
  IF NEW.role IS NOT DISTINCT FROM OLD.role
     AND NEW.permissions IS NOT DISTINCT FROM OLD.permissions THEN
    RETURN NEW;
  END IF;

  -- Determine if caller is Super Admin (or a system/service role with no auth.uid)
  IF auth.uid() IS NULL THEN
    RETURN NEW; -- service role / triggers
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.employees
    WHERE auth_user_id = auth.uid()
      AND role = 'Super Admin'
      AND status = 'Active'
      AND COALESCE(disabled, false) = false
  ) INTO v_caller_is_super_admin;

  -- Only Super Admin can grant elevated roles
  IF NEW.role IS DISTINCT FROM OLD.role
     AND NEW.role IN ('Super Admin', 'Administrator')
     AND NOT v_caller_is_super_admin THEN
    RAISE EXCEPTION 'Only Super Admin can assign role %', NEW.role
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Prevent self-modification of own role/permissions unless Super Admin
  IF OLD.auth_user_id = auth.uid()
     AND (NEW.role IS DISTINCT FROM OLD.role OR NEW.permissions IS DISTINCT FROM OLD.permissions)
     AND NOT v_caller_is_super_admin THEN
    RAISE EXCEPTION 'You cannot modify your own role or permissions'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON public.employees;
CREATE TRIGGER trg_prevent_role_escalation
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_escalation();

-- 3. withdrawal_verification_codes.verification_code hashing trigger
CREATE OR REPLACE FUNCTION public.hash_withdrawal_verification_code()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions' AS $$
BEGIN
  IF NEW.verification_code IS NOT NULL AND length(NEW.verification_code) > 0
     AND NEW.verification_code NOT LIKE '$2a$%' AND NEW.verification_code NOT LIKE '$2b$%' AND NEW.verification_code NOT LIKE '$2y$%' THEN
    NEW.verification_code := extensions.crypt(NEW.verification_code, extensions.gen_salt('bf', 10));
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_hash_withdrawal_verification_code ON public.withdrawal_verification_codes;
CREATE TRIGGER trg_hash_withdrawal_verification_code
  BEFORE INSERT OR UPDATE OF verification_code ON public.withdrawal_verification_codes
  FOR EACH ROW EXECUTE FUNCTION public.hash_withdrawal_verification_code();

UPDATE public.withdrawal_verification_codes
  SET verification_code = extensions.crypt(verification_code, extensions.gen_salt('bf', 10))
  WHERE verification_code IS NOT NULL
    AND verification_code NOT LIKE '$2a$%' AND verification_code NOT LIKE '$2b$%' AND verification_code NOT LIKE '$2y$%';
