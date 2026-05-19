-- 1. Revoke column-level SELECT on sensitive (already-hashed) columns so they
--    cannot be read via the table even by privileged RLS policies.
--    Verification must go through SECURITY DEFINER RPCs (verify_email_otp,
--    verify_2fa_code, verify_admin_withdrawal_pin, verify_maintenance_recovery_*).
REVOKE SELECT (pin_code)            ON public.admin_initiated_withdrawals FROM anon, authenticated;
REVOKE SELECT (code)                ON public.email_verification_codes    FROM anon, authenticated;
REVOKE SELECT (code)                ON public.verification_codes          FROM anon, authenticated;
REVOKE SELECT (verification_code)   ON public.login_verification_codes    FROM anon, authenticated;
REVOKE SELECT (recovery_pin, recovery_key) ON public.system_maintenance   FROM anon, authenticated;

-- 2. Restrict open INSERT policies — only service_role (edge functions) may
--    insert verification codes. Service role bypasses RLS automatically.
DROP POLICY IF EXISTS "Authenticated can insert verification codes" ON public.verification_codes;
DROP POLICY IF EXISTS "Allow inserting login verification codes"    ON public.login_verification_codes;

-- 3. Tighten notifications SELECT policy so NULL-target broadcasts respect
--    target_role and target_department when those are set. Backwards
--    compatible: notifications with target_role=NULL AND target_department=NULL
--    remain visible to everyone (company-wide broadcasts).
DROP POLICY IF EXISTS "Users view their own notifications" ON public.notifications;
CREATE POLICY "Users view their own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (
  target_user_id = auth.uid()
  OR is_current_user_admin()
  OR (
    target_user_id IS NULL
    AND (
      target_role IS NULL
      OR lower(target_role) = lower(public.get_user_role())
    )
    AND (
      target_department IS NULL
      OR target_department IN (
        SELECT department FROM public.employees
        WHERE auth_user_id = auth.uid() AND status = 'Active'
      )
    )
  )
);

-- 4. Storage 'statements' bucket — scope INSERT to the user's own folder
--    so authenticated users cannot upload into other users' paths.
DROP POLICY IF EXISTS "Users can upload own statements" ON storage.objects;
CREATE POLICY "Users can upload own statements"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'statements'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 5. Drop overly-permissive (USING true / WITH CHECK true) write policies on
--    archive schema tables. The 'archive' schema is historical data; writes
--    should go through service role only.
DROP POLICY IF EXISTS "Users can update notifications"               ON archive.finance_notifications;
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON archive.finance_notifications;
DROP POLICY IF EXISTS "Users can insert own money requests"          ON archive.money_requests;
DROP POLICY IF EXISTS "Anyone can insert money requests"             ON archive.money_requests;
DROP POLICY IF EXISTS "Users can create their own money requests"    ON archive.money_requests;
DROP POLICY IF EXISTS "Authenticated users can update payment records" ON archive.payment_records;
DROP POLICY IF EXISTS "Authenticated users can create payment records" ON archive.payment_records;