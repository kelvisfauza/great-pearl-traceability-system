-- Fix: Allow guarantors to view and update loans they are guaranteeing

-- Drop and recreate SELECT policy to include guarantor access
DROP POLICY IF EXISTS "Employees view own loans" ON public.loans;
CREATE POLICY "Employees view own loans"
ON public.loans
FOR SELECT
TO authenticated
USING (
  employee_email = get_current_user_email()
  OR guarantor_email = get_current_user_email()
  OR user_has_permission('Finance'::text)
  OR is_current_user_admin()
);

-- Drop and recreate employee UPDATE policy to include guarantor access
DROP POLICY IF EXISTS "Employees can update own loans" ON public.loans;
CREATE POLICY "Employees can update own loans"
ON public.loans
FOR UPDATE
TO authenticated
USING (
  employee_email = get_current_user_email()
  OR guarantor_email = get_current_user_email()
)
WITH CHECK (
  employee_email = get_current_user_email()
  OR guarantor_email = get_current_user_email()
);