-- contract_files: replace broad authenticated policies with department-scoped policies
DROP POLICY IF EXISTS "Authenticated can view contract files" ON public.contract_files;
DROP POLICY IF EXISTS "Authenticated users can insert contract files" ON public.contract_files;
DROP POLICY IF EXISTS "Authenticated users can update contract files" ON public.contract_files;

CREATE POLICY "Sales procurement and admins can view contract files"
  ON public.contract_files FOR SELECT TO authenticated
  USING (
    is_current_user_admin_by_role()
    OR user_has_permission('Sales & Marketing')
    OR user_has_permission('Sales Marketing')
    OR user_has_permission('Procurement')
    OR user_has_permission('Finance')
  );

CREATE POLICY "Sales procurement and admins can insert contract files"
  ON public.contract_files FOR INSERT TO authenticated
  WITH CHECK (
    is_current_user_admin_by_role()
    OR user_has_permission('Sales & Marketing')
    OR user_has_permission('Sales Marketing')
    OR user_has_permission('Procurement')
  );

CREATE POLICY "Sales procurement and admins can update contract files"
  ON public.contract_files FOR UPDATE TO authenticated
  USING (
    is_current_user_admin_by_role()
    OR user_has_permission('Sales & Marketing')
    OR user_has_permission('Sales Marketing')
    OR user_has_permission('Procurement')
  );

-- support_tickets: restrict to Support/Admin
DROP POLICY IF EXISTS "Authenticated staff can view tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Authenticated staff can update tickets" ON public.support_tickets;

CREATE POLICY "Support and admins can view tickets"
  ON public.support_tickets FOR SELECT TO authenticated
  USING (
    is_current_user_admin_by_role()
    OR user_has_permission('Support')
    OR user_has_permission('IT Management')
  );

CREATE POLICY "Support and admins can update tickets"
  ON public.support_tickets FOR UPDATE TO authenticated
  USING (
    is_current_user_admin_by_role()
    OR user_has_permission('Support')
    OR user_has_permission('IT Management')
  )
  WITH CHECK (
    is_current_user_admin_by_role()
    OR user_has_permission('Support')
    OR user_has_permission('IT Management')
  );

-- support_ticket_replies: restrict SELECT to Support/Admin
DROP POLICY IF EXISTS "Authenticated staff can view replies" ON public.support_ticket_replies;
DROP POLICY IF EXISTS "Authenticated staff can insert replies" ON public.support_ticket_replies;

CREATE POLICY "Support and admins can view replies"
  ON public.support_ticket_replies FOR SELECT TO authenticated
  USING (
    is_current_user_admin_by_role()
    OR user_has_permission('Support')
    OR user_has_permission('IT Management')
  );

CREATE POLICY "Support and admins can insert replies"
  ON public.support_ticket_replies FOR INSERT TO authenticated
  WITH CHECK (
    (author_type = ANY (ARRAY['admin'::text, 'system'::text]))
    AND (
      is_current_user_admin_by_role()
      OR user_has_permission('Support')
      OR user_has_permission('IT Management')
    )
  );