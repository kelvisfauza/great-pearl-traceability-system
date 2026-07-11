
DROP POLICY IF EXISTS "Authenticated users can insert requisitions" ON public.requisitions;

DROP POLICY IF EXISTS "Authenticated users can create price approval requests" ON public.price_approval_requests;
DROP POLICY IF EXISTS "Authenticated users can update price approval requests" ON public.price_approval_requests;

CREATE POLICY "Pricing roles can create price approval requests"
ON public.price_approval_requests FOR INSERT TO authenticated
WITH CHECK (
  is_current_user_admin()
  OR user_has_permission('Procurement')
  OR user_has_permission('Finance')
  OR user_has_permission('Finance Management')
);

CREATE POLICY "Pricing roles can update price approval requests"
ON public.price_approval_requests FOR UPDATE TO authenticated
USING (
  is_current_user_admin()
  OR user_has_permission('Procurement')
  OR user_has_permission('Finance')
  OR user_has_permission('Finance Management')
)
WITH CHECK (
  is_current_user_admin()
  OR user_has_permission('Procurement')
  OR user_has_permission('Finance')
  OR user_has_permission('Finance Management')
);

DROP POLICY IF EXISTS "Authenticated read weighbridge tickets" ON public.weighbridge_scanned_tickets;

CREATE POLICY "Scoped read weighbridge tickets"
ON public.weighbridge_scanned_tickets FOR SELECT TO authenticated
USING (
  is_current_user_admin()
  OR user_has_permission('Quality')
  OR user_has_permission('Store')
  OR user_has_permission('Procurement')
  OR user_has_permission('Finance')
  OR EXISTS (
    SELECT 1 FROM public.weighbridge_scan_sessions s
    WHERE s.id = weighbridge_scanned_tickets.session_id
      AND s.created_by = auth.uid()::text
  )
);
