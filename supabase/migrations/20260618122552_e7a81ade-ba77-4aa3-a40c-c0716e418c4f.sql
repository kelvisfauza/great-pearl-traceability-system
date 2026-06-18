
DROP POLICY IF EXISTS employees_select_policy ON public.employees;
CREATE POLICY employees_select_policy ON public.employees
  FOR SELECT
  USING (
    (auth_user_id = auth.uid())
    OR is_current_user_administrator()
    OR user_has_permission('Human Resources:view')
  );

CREATE OR REPLACE FUNCTION public.get_employee_directory_safe()
RETURNS TABLE (
  id uuid,
  name text,
  employee_id text,
  department text,
  "position" text,
  phone text,
  email text,
  status text,
  role text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    is_current_user_administrator()
    OR user_has_permission('Human Resources:view')
    OR user_has_permission('IT Management')
    OR user_has_permission('IT Management:view')
    OR user_has_permission('IT Management:manage')
  ) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  RETURN QUERY
  SELECT e.id, e.name, e.employee_id, e.department, e."position",
         e.phone, e.email, e.status, e.role
  FROM public.employees e
  WHERE e.status = 'Active'
  ORDER BY e.name;
END;
$$;

REVOKE ALL ON FUNCTION public.get_employee_directory_safe() FROM public;
GRANT EXECUTE ON FUNCTION public.get_employee_directory_safe() TO authenticated;

DROP TRIGGER IF EXISTS trg_hash_verification_codes_code ON public.verification_codes;
CREATE TRIGGER trg_hash_verification_codes_code
  BEFORE INSERT OR UPDATE OF code ON public.verification_codes
  FOR EACH ROW EXECUTE FUNCTION public.hash_verification_codes_code();

DROP TRIGGER IF EXISTS trg_hash_withdrawal_verification_code ON public.withdrawal_verification_codes;
CREATE TRIGGER trg_hash_withdrawal_verification_code
  BEFORE INSERT OR UPDATE OF verification_code ON public.withdrawal_verification_codes
  FOR EACH ROW EXECUTE FUNCTION public.hash_withdrawal_verification_code();

DROP TRIGGER IF EXISTS trg_hash_login_verification_code ON public.login_verification_codes;
CREATE TRIGGER trg_hash_login_verification_code
  BEFORE INSERT OR UPDATE OF verification_code ON public.login_verification_codes
  FOR EACH ROW EXECUTE FUNCTION public.hash_login_verification_codes_code();

DROP POLICY IF EXISTS "Admins can view verification codes" ON public.verification_codes;
DROP POLICY IF EXISTS "Only admins can view withdrawal verification codes" ON public.withdrawal_verification_codes;

DROP POLICY IF EXISTS "Service role manages birthday rewards" ON public.birthday_rewards;
