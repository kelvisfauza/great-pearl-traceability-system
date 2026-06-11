
-- 1) SENSITIVE_DATA_OVERSHARING: Remove IT Management's full read on employees.
-- Drop the overly broad SELECT policy. HR and admins retain access via the
-- remaining "Admins can view all employees" and "employees_select_policy" policies.
-- Users can still view their own record via "Users can view own employee record".
DROP POLICY IF EXISTS "Users view own employee record" ON public.employees;

-- 2) VERIFICATION_BYPASS: Stop users from updating their own verification rows
-- directly (which let them flip verified=true). Verification must be performed
-- server-side via SECURITY DEFINER / service_role. Drop the self-update policy.
DROP POLICY IF EXISTS "Users update own verification code" ON public.login_verification_codes;

-- (Reads, if any, are unaffected. Edge functions use service_role and bypass RLS.)

-- 3) MISSING_OWNERSHIP_CHECK: Force device_sessions INSERTs to use the caller's
-- own email so nobody can register a trusted device against a colleague's email.
DROP POLICY IF EXISTS "Users can insert own devices" ON public.device_sessions;

CREATE POLICY "Users can insert own devices"
ON public.device_sessions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND user_email = (SELECT email FROM auth.users WHERE id = auth.uid())::text
);
