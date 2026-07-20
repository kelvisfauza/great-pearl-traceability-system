
-- 1. contract_approvals: restrict INSERT to authorized departments
DROP POLICY IF EXISTS "Anyone can insert contract approvals" ON public.contract_approvals;
CREATE POLICY "Authorized departments can insert contract approvals"
  ON public.contract_approvals FOR INSERT TO authenticated
  WITH CHECK (
    user_has_permission('Sales Marketing') OR
    user_has_permission('Sales') OR
    user_has_permission('Procurement') OR
    user_has_permission('Finance') OR
    is_current_user_admin()
  );

-- 2. workflow_steps: restrict INSERT to finance/admin
DROP POLICY IF EXISTS "Users can create workflow steps" ON public.workflow_steps;
CREATE POLICY "Finance or admin can create workflow steps"
  ON public.workflow_steps FOR INSERT TO authenticated
  WITH CHECK (is_finance_or_admin());

-- 3. profile_pictures bucket: remove public read policy, restrict to authenticated users
DROP POLICY IF EXISTS "Anyone can view profile pictures" ON storage.objects;
CREATE POLICY "Authenticated users can view profile pictures"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'profile_pictures');

-- 4. Set fixed search_path on flagged function
ALTER FUNCTION public.budget_touch_updated_at() SET search_path = public;
