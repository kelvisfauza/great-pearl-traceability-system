CREATE OR REPLACE FUNCTION public.can_submit_contract_renewal_request(_employee_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.employees e
    WHERE lower(e.email) = lower(_employee_email)
      AND (
        e.auth_user_id = auth.uid()
        OR lower(e.email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
        OR lower(e.email) = lower(COALESCE((SELECT au.email FROM auth.users au WHERE au.id = auth.uid()), ''))
      )
  )
  OR lower(_employee_email) = public.current_user_email()
$$;

REVOKE ALL ON FUNCTION public.can_submit_contract_renewal_request(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_submit_contract_renewal_request(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_submit_contract_renewal_request(text) TO service_role;

DROP POLICY IF EXISTS "Users can create their own renewal requests" ON public.contract_renewal_requests;

CREATE POLICY "Users can create their own renewal requests"
ON public.contract_renewal_requests
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_submit_contract_renewal_request(employee_email)
  AND status IN ('pending', 'negotiating')
  AND requested_months BETWEEN 3 AND 6
  AND admin_email IS NULL
  AND admin_notes IS NULL
  AND approved_at IS NULL
  AND rejected_at IS NULL
  AND new_contract_id IS NULL
  AND pdf_url IS NULL
  AND hr_response IS NULL
  AND hr_responded_at IS NULL
  AND hr_responded_by IS NULL
);

DROP POLICY IF EXISTS "Users can view their own renewal requests" ON public.contract_renewal_requests;

CREATE POLICY "Users can view their own renewal requests"
ON public.contract_renewal_requests
FOR SELECT
TO authenticated
USING (
  public.can_submit_contract_renewal_request(employee_email)
  OR public.has_role(auth.uid(), 'Administrator')
  OR public.has_role(auth.uid(), 'Super Admin')
  OR EXISTS (
    SELECT 1
    FROM public.employees e
    WHERE e.auth_user_id = auth.uid()
      AND (
        e.role = ANY (ARRAY['Administrator'::text, 'Super Admin'::text])
        OR e.department = ANY (ARRAY['Human Resources'::text, 'HR'::text])
      )
  )
);