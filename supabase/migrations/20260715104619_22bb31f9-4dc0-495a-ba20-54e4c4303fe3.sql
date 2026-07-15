
DROP POLICY IF EXISTS "Anyone can update contract approvals" ON public.contract_approvals;
CREATE POLICY "Approvers can update contract approvals"
ON public.contract_approvals FOR UPDATE
USING (
  user_has_permission('Sales Marketing') OR user_has_permission('Sales')
  OR user_has_permission('Procurement') OR user_has_permission('Finance')
  OR is_current_user_admin()
)
WITH CHECK (
  user_has_permission('Sales Marketing') OR user_has_permission('Sales')
  OR user_has_permission('Procurement') OR user_has_permission('Finance')
  OR is_current_user_admin()
);

DROP POLICY IF EXISTS "Department can manage daily_tasks" ON public.daily_tasks;
CREATE POLICY "Users can view own department daily_tasks"
ON public.daily_tasks FOR SELECT
USING (
  is_current_user_admin()
  OR department = (SELECT department FROM public.employees WHERE auth_user_id = auth.uid() LIMIT 1)
  OR completed_by = get_current_user_email()
);
CREATE POLICY "Users can insert own department daily_tasks"
ON public.daily_tasks FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    is_current_user_admin()
    OR department = (SELECT department FROM public.employees WHERE auth_user_id = auth.uid() LIMIT 1)
  )
);
CREATE POLICY "Users can update own department daily_tasks"
ON public.daily_tasks FOR UPDATE
USING (
  is_current_user_admin()
  OR (department = (SELECT department FROM public.employees WHERE auth_user_id = auth.uid() LIMIT 1)
      AND completed_by = get_current_user_email())
)
WITH CHECK (
  is_current_user_admin()
  OR (department = (SELECT department FROM public.employees WHERE auth_user_id = auth.uid() LIMIT 1)
      AND completed_by = get_current_user_email())
);

DROP POLICY IF EXISTS "Users can update modification requests" ON public.modification_requests;
CREATE POLICY "Finance or admin can update modification requests"
ON public.modification_requests FOR UPDATE
USING (is_finance_or_admin())
WITH CHECK (is_finance_or_admin());

DROP POLICY IF EXISTS "Users can update workflow steps" ON public.workflow_steps;
CREATE POLICY "Finance or admin can update workflow steps"
ON public.workflow_steps FOR UPDATE
USING (is_finance_or_admin())
WITH CHECK (is_finance_or_admin());

DROP POLICY IF EXISTS "realtime_privileged_all_topics" ON realtime.messages;
CREATE POLICY "realtime_privileged_safe_topics"
ON realtime.messages FOR SELECT
USING (
  is_privileged_realtime_subscriber(auth.uid())
  AND (
    realtime.topic() ~ '^call:[a-zA-Z0-9_-]+$'
    OR realtime.topic() ~ '^group-call:[a-zA-Z0-9_-]+$'
    OR realtime.topic() ~ '^presence-realtime-[a-zA-Z0-9]+$'
  )
);
