-- Relax contract_renewal_requests INSERT policy so it also accepts the email
-- when JWT email is empty/different — match the employee record by auth.uid().
DROP POLICY IF EXISTS "Employees create own renewal requests" ON public.contract_renewal_requests;

CREATE POLICY "Employees create own renewal requests"
ON public.contract_renewal_requests
FOR INSERT
TO authenticated
WITH CHECK (
  lower(employee_email) = lower(COALESCE((auth.jwt() ->> 'email'::text), ''::text))
  OR lower(employee_email) = lower(COALESCE((SELECT email FROM auth.users WHERE id = auth.uid()), ''))
  OR EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.auth_user_id = auth.uid()
      AND lower(e.email) = lower(employee_email)
  )
);

-- Also broaden SELECT so users always see their own renewal requests via auth.uid().
DROP POLICY IF EXISTS "Employees view own renewal requests" ON public.contract_renewal_requests;

CREATE POLICY "Employees view own renewal requests"
ON public.contract_renewal_requests
FOR SELECT
TO authenticated
USING (
  lower(employee_email) = lower(COALESCE((auth.jwt() ->> 'email'::text), ''::text))
  OR lower(employee_email) = lower(COALESCE((SELECT email FROM auth.users WHERE id = auth.uid()), ''))
  OR EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.auth_user_id = auth.uid()
      AND lower(e.email) = lower(employee_email)
  )
  OR EXISTS (
    SELECT 1 FROM public.employees e
    WHERE lower(e.email) = lower(COALESCE((auth.jwt() ->> 'email'::text), ''::text))
      AND ((e.role = ANY (ARRAY['Administrator'::text, 'Super Admin'::text])) OR e.department = 'Human Resources')
  )
);