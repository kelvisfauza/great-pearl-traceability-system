
-- Public RPC: get the latest unexpired login OTP code for an employee.
-- Used by the QR-scan "Code" option so the cardholder (or anyone scanning
-- the physical card) can read the most recent login code from email.
CREATE OR REPLACE FUNCTION public.get_latest_login_code(_lookup text)
RETURNS TABLE(
  code text,
  recipient_email text,
  template_name text,
  created_at timestamptz,
  expires_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH emp AS (
    SELECT lower(e.email) AS email
    FROM public.employees e
    WHERE (e.id::text = _lookup OR e.employee_id = _lookup)
      AND e.email IS NOT NULL
      AND COALESCE(e.disabled, false) = false
    LIMIT 1
  )
  SELECT v.code,
         v.email AS recipient_email,
         'login_otp'::text AS template_name,
         v.created_at,
         v.expires_at
  FROM public.email_verification_codes v
  JOIN emp ON lower(v.email) = emp.email
  WHERE v.expires_at > now()
    AND v.verified_at IS NULL
  ORDER BY v.created_at DESC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_latest_login_code(text) TO anon, authenticated;
