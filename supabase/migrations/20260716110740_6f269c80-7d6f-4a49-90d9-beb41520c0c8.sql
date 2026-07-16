
-- Fix sent_emails_log to accept IT Management permission (granular) and IT Officer role
DROP POLICY IF EXISTS "IT and Admins can view sent emails" ON public.sent_emails_log;
CREATE POLICY "IT and Admins can view sent emails"
  ON public.sent_emails_log
  FOR SELECT
  USING (
    public.is_current_user_admin()
    OR public.user_has_permission('IT Management')
    OR public.user_has_permission('IT')
    OR EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.auth_user_id = auth.uid()
        AND e.role IN ('IT Officer','IT','Administrator','Super Admin','Manager')
    )
  );

-- Fix sms_logs to use permission helper (supports granular "IT Management:view" strings)
DROP POLICY IF EXISTS "Authorized staff view sms logs" ON public.sms_logs;
CREATE POLICY "Authorized staff view sms logs"
  ON public.sms_logs
  FOR SELECT
  USING (
    public.is_current_user_admin()
    OR public.user_has_permission('IT Management')
    OR EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.auth_user_id = auth.uid()
        AND e.role IN ('IT Officer','IT','Administrator','Super Admin')
    )
    OR EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.auth_user_id = auth.uid()
        AND ('Human Resources' = ANY (e.permissions))
        AND COALESCE(sms_logs.department,'') ILIKE 'Human Resources%'
    )
  );
