-- Drop restrictive INSERT policy and create one that allows admins to insert
DROP POLICY IF EXISTS "System can insert vouchers" ON public.christmas_vouchers;

-- Allow Administrators to insert vouchers
CREATE POLICY "Admins can insert vouchers"
ON public.christmas_vouchers
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees 
    WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
    AND role IN ('Administrator', 'Super Admin')
  )
);

-- Also allow all authenticated users to view their own vouchers (fix policy)
DROP POLICY IF EXISTS "Users can view their own vouchers" ON public.christmas_vouchers;

CREATE POLICY "Users can view their own vouchers"
ON public.christmas_vouchers
FOR SELECT
USING (
  employee_email = current_setting('request.jwt.claims', true)::json->>'email'
  OR EXISTS (
    SELECT 1 FROM employees 
    WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
    AND role IN ('Administrator', 'Super Admin')
  )
);