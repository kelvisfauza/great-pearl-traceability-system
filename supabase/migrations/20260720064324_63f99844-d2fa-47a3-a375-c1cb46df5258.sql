DROP POLICY IF EXISTS "Users view own approval requests" ON public.approval_requests;

CREATE POLICY "Users view own approval requests"
ON public.approval_requests
FOR SELECT
USING (
  requestedby = (SELECT email FROM public.employees WHERE auth_user_id = auth.uid())
  OR is_current_user_admin()
  OR EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.auth_user_id = auth.uid()
      AND e.status = 'Active'
      AND COALESCE(e.disabled, false) = false
      AND (
        e.role = ANY (ARRAY['Finance Manager','Finance','Administrator','Super Admin','Manager','Managing Director'])
        OR e.permissions && ARRAY['Finance','Finance Management','Finance Approval','Administration','Approvals']
        OR EXISTS (
          SELECT 1 FROM unnest(e.permissions) perm(perm)
          WHERE perm.perm LIKE 'Finance%' OR perm.perm = 'Administration' OR perm.perm LIKE 'Approvals%'
        )
      )
  )
);