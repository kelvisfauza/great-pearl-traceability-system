-- Public RPC: return ALL active (unexpired, unused) codes for an employee
-- across login OTPs, generic verification codes, and withdrawal approval codes.
-- Used by the QR-scan "Login Code" page so the cardholder can quickly read
-- whatever code was just sent to their email.
CREATE OR REPLACE FUNCTION public.get_all_active_codes(_lookup text)
RETURNS TABLE(
  code text,
  recipient_email text,
  category text,
  label text,
  created_at timestamptz,
  expires_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH emp AS (
    SELECT lower(e.email) AS email, e.id AS uid
    FROM public.employees e
    WHERE (e.id::text = _lookup OR e.employee_id = _lookup)
      AND e.email IS NOT NULL
      AND COALESCE(e.disabled, false) = false
    LIMIT 1
  )
  -- 1. Login OTP cache
  SELECT v.code,
         v.email AS recipient_email,
         'login'::text AS category,
         'Login Code'::text AS label,
         v.created_at,
         v.expires_at
  FROM public.email_verification_codes v
  JOIN emp ON lower(v.email) = emp.email
  WHERE v.expires_at > now()
    AND v.verified_at IS NULL

  UNION ALL

  -- 2. Generic verification codes (signup, email change, etc.)
  SELECT vc.code,
         vc.email AS recipient_email,
         'verification'::text AS category,
         'Verification Code'::text AS label,
         vc.created_at,
         vc.expires_at
  FROM public.verification_codes vc
  JOIN emp ON lower(vc.email) = emp.email
  WHERE vc.expires_at > now()

  UNION ALL

  -- 3. Withdrawal approval codes (sent to the approver's email)
  SELECT wvc.verification_code AS code,
         wvc.approver_email AS recipient_email,
         'withdrawal'::text AS category,
         'Withdrawal Approval Code'::text AS label,
         wvc.created_at,
         wvc.code_expires_at AS expires_at
  FROM public.withdrawal_verification_codes wvc
  JOIN emp ON lower(wvc.approver_email) = emp.email
  WHERE wvc.code_expires_at > now()
    AND COALESCE(wvc.verified, false) = false

  ORDER BY created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_active_codes(text) TO anon, authenticated;
