
DROP POLICY IF EXISTS "authenticated can view all refs" ON public.expense_template_refs;
CREATE POLICY "Owners and finance/admin can view refs"
ON public.expense_template_refs FOR SELECT TO authenticated
USING (
  (employee_email IS NOT NULL AND lower(employee_email) = current_user_email())
  OR is_current_user_admin()
  OR lower(coalesce(get_user_role(), '')) IN ('finance','hr','manager')
);

DROP POLICY IF EXISTS "Authenticated can create notifications" ON public.notifications;
CREATE POLICY "Privileged users or self-target can create notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    is_current_user_admin()
    OR lower(coalesce(get_user_role(), '')) IN ('hr','manager','supervisor','finance','operations')
    OR target_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "System can insert SMS notifications" ON public.sms_notification_queue;
DROP POLICY IF EXISTS "System can update SMS notifications" ON public.sms_notification_queue;
CREATE POLICY "Admins/HR can insert SMS notifications"
ON public.sms_notification_queue FOR INSERT TO authenticated
WITH CHECK (
  is_current_user_admin()
  OR lower(coalesce(get_user_role(), '')) IN ('hr','manager','operations','finance')
);
CREATE POLICY "Admins/HR can update SMS notifications"
ON public.sms_notification_queue FOR UPDATE TO authenticated
USING (
  is_current_user_admin()
  OR lower(coalesce(get_user_role(), '')) IN ('hr','manager','operations','finance')
)
WITH CHECK (
  is_current_user_admin()
  OR lower(coalesce(get_user_role(), '')) IN ('hr','manager','operations','finance')
);

DROP POLICY IF EXISTS "System can insert activity" ON public.user_activity;
CREATE POLICY "Users can insert their own activity"
ON public.user_activity FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Anyone can update sessions" ON public.weighbridge_scan_sessions;
CREATE POLICY "Creator or admin can update sessions"
ON public.weighbridge_scan_sessions FOR UPDATE TO authenticated
USING (created_by = auth.uid()::text OR is_current_user_admin())
WITH CHECK (created_by = auth.uid()::text OR is_current_user_admin());
