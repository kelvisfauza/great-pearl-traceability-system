
-- 1) employees: remove IT Management from update/insert path
CREATE OR REPLACE FUNCTION public.can_manage_employees()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.is_current_user_administrator()
      OR public.user_has_permission('Human Resources:manage')
      OR public.user_has_permission('Human Resources:edit')
      OR public.user_has_permission('User Management:manage');
$$;

DROP POLICY IF EXISTS employees_update_policy ON public.employees;
CREATE POLICY employees_update_policy ON public.employees
  FOR UPDATE
  USING (public.can_manage_employees() OR public.user_has_permission('Human Resources:edit'))
  WITH CHECK (public.can_manage_employees() OR public.user_has_permission('Human Resources:edit'));

DROP POLICY IF EXISTS employees_insert_policy ON public.employees;
CREATE POLICY employees_insert_policy ON public.employees
  FOR INSERT
  WITH CHECK (public.can_manage_employees() OR public.user_has_permission('Human Resources:create'));

-- 2) admin_initiated_withdrawals: stop direct SELECT for employees; expose safe RPC
DROP POLICY IF EXISTS "Users can view own admin_initiated_withdrawals" ON public.admin_initiated_withdrawals;

CREATE OR REPLACE FUNCTION public.get_my_pending_admin_withdrawal()
RETURNS TABLE(
  id uuid,
  employee_id text,
  employee_email text,
  employee_name text,
  amount numeric,
  reason text,
  initiated_by text,
  initiated_by_name text,
  status text,
  pin_expires_at timestamptz,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id, employee_id, employee_email, employee_name, amount, reason,
         initiated_by, initiated_by_name, status, pin_expires_at, created_at
  FROM public.admin_initiated_withdrawals
  WHERE lower(employee_email) = lower(COALESCE((auth.jwt() ->> 'email')::text, ''))
    AND status = 'pending_pin'
    AND pin_expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_my_pending_admin_withdrawal() TO authenticated;

CREATE OR REPLACE FUNCTION public.decline_my_admin_withdrawal(_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_email text := lower(COALESCE((auth.jwt() ->> 'email')::text, ''));
BEGIN
  UPDATE public.admin_initiated_withdrawals
     SET status = 'cancelled', updated_at = now()
   WHERE id = _id
     AND lower(employee_email) = v_email
     AND status = 'pending_pin';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found_or_invalid_status');
  END IF;
  RETURN jsonb_build_object('success', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.decline_my_admin_withdrawal(uuid) TO authenticated;

-- 3) email_verification_codes: stop direct user SELECT (verification flows via verify_email_otp)
DROP POLICY IF EXISTS "Users can view their own email verification codes" ON public.email_verification_codes;

-- 4) milling tables: restrict SELECT to milling/finance/admin
DROP POLICY IF EXISTS "Authenticated can view milling cash" ON public.milling_cash_transactions;
CREATE POLICY "Milling/Finance/Admin can view milling cash"
  ON public.milling_cash_transactions
  FOR SELECT
  USING (
    public.user_has_permission('Milling Operations')
    OR public.user_has_permission('Finance')
    OR public.is_current_user_admin()
  );

DROP POLICY IF EXISTS "Authenticated users can view milling customers" ON public.milling_customers;
CREATE POLICY "Milling/Finance/Admin can view milling customers"
  ON public.milling_customers
  FOR SELECT
  USING (
    public.user_has_milling_access()
    OR public.user_has_permission('Finance')
    OR public.is_current_user_admin()
  );
