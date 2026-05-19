
-- Drop redundant overly-permissive INSERT policies on milling tables
DROP POLICY IF EXISTS "Authenticated can insert milling transactions" ON public.milling_transactions;
DROP POLICY IF EXISTS "Authenticated can insert milling cash" ON public.milling_cash_transactions;

-- Tighten expense_template_refs INSERT/UPDATE
DROP POLICY IF EXISTS "anyone authenticated can insert their own ref" ON public.expense_template_refs;
DROP POLICY IF EXISTS "authenticated can mark refs used" ON public.expense_template_refs;

CREATE POLICY "Users can insert their own expense template refs"
ON public.expense_template_refs
FOR INSERT
TO authenticated
WITH CHECK (
  employee_email IS NULL
  OR lower(employee_email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
  OR is_current_user_admin()
);

CREATE POLICY "Users can mark their own expense template refs as used"
ON public.expense_template_refs
FOR UPDATE
TO authenticated
USING (
  employee_email IS NULL
  OR lower(employee_email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
  OR is_current_user_admin()
)
WITH CHECK (
  employee_email IS NULL
  OR lower(employee_email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
  OR is_current_user_admin()
);
