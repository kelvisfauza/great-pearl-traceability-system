CREATE OR REPLACE FUNCTION public.current_user_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT lower(COALESCE(
    NULLIF(auth.jwt() ->> 'email', ''),
    (SELECT email FROM auth.users WHERE id = auth.uid())
  ))
$$;

GRANT EXECUTE ON FUNCTION public.current_user_email() TO authenticated, anon;

DROP POLICY IF EXISTS "Users can create their own renewal requests" ON public.contract_renewal_requests;
DROP POLICY IF EXISTS "Users can view their own renewal requests" ON public.contract_renewal_requests;

CREATE POLICY "Users can create their own renewal requests"
ON public.contract_renewal_requests
FOR INSERT
TO authenticated
WITH CHECK (
  lower(employee_email) = public.current_user_email()
  OR EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.auth_user_id = auth.uid()
      AND lower(e.email) = lower(contract_renewal_requests.employee_email)
  )
);

CREATE POLICY "Users can view their own renewal requests"
ON public.contract_renewal_requests
FOR SELECT
TO authenticated
USING (
  lower(employee_email) = public.current_user_email()
  OR EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.auth_user_id = auth.uid()
      AND lower(e.email) = lower(contract_renewal_requests.employee_email)
  )
  OR public.has_role(auth.uid(), 'Administrator'::app_role)
  OR public.has_role(auth.uid(), 'Super Admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.auth_user_id = auth.uid()
      AND (e.role IN ('Administrator','Super Admin') OR e.department IN ('Human Resources','HR'))
  )
);