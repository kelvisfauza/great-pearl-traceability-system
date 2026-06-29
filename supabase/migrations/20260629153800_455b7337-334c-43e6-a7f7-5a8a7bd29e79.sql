-- 1) audit_logs: harden INSERT policy. service_role bypasses RLS, so deny RLS-path inserts entirely.
DROP POLICY IF EXISTS "Only service role can insert audit logs" ON public.audit_logs;
CREATE POLICY "Block direct audit log inserts"
ON public.audit_logs
FOR INSERT
WITH CHECK (false);

-- 2) deletion_requests: remove Finance from SELECT — record_data snapshots are admin/requester only.
DROP POLICY IF EXISTS "Requester or admin/finance view deletion requests" ON public.deletion_requests;
CREATE POLICY "Requester or admin view deletion requests"
ON public.deletion_requests
FOR SELECT
USING (
  (requested_by = ((SELECT u.email FROM auth.users u WHERE u.id = auth.uid()))::text)
  OR is_current_user_admin()
);

-- 4) system_maintenance: hash any legacy plaintext recovery_key (trigger covers future writes)
UPDATE public.system_maintenance
SET recovery_key = extensions.crypt(recovery_key, extensions.gen_salt('bf', 10))
WHERE recovery_key IS NOT NULL AND recovery_key !~ '^\$2[aby]\$';

UPDATE public.system_maintenance
SET recovery_pin = extensions.crypt(recovery_pin, extensions.gen_salt('bf', 10))
WHERE recovery_pin IS NOT NULL AND recovery_pin !~ '^\$2[aby]\$';