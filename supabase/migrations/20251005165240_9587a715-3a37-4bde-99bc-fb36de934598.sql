-- Add UPDATE policy for finance_cash_transactions to allow confirmation
CREATE POLICY "Finance users can update cash transactions"
ON public.finance_cash_transactions
FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.employees
    WHERE employees.auth_user_id = auth.uid()
    AND employees.status = 'Active'
    AND (
      'Finance' = ANY(employees.permissions)
      OR employees.role = 'Administrator'
      OR '*' = ANY(employees.permissions)
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.employees
    WHERE employees.auth_user_id = auth.uid()
    AND employees.status = 'Active'
    AND (
      'Finance' = ANY(employees.permissions)
      OR employees.role = 'Administrator'
      OR '*' = ANY(employees.permissions)
    )
  )
);