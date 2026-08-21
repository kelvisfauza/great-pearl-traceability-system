
-- coffee_bookings
DROP POLICY IF EXISTS "Authenticated can read coffee_bookings" ON public.coffee_bookings;
CREATE POLICY "Scoped read coffee_bookings" ON public.coffee_bookings
FOR SELECT TO authenticated
USING (
  is_current_user_admin()
  OR user_has_permission('Procurement')
  OR user_has_permission('Store Management')
  OR user_has_permission('Finance')
  OR created_by = current_user_email()
  OR created_by = (auth.uid())::text
);

-- dispatch_monitoring_forms
DROP POLICY IF EXISTS "dmf_read_authenticated" ON public.dispatch_monitoring_forms;
CREATE POLICY "dmf_read_scoped" ON public.dispatch_monitoring_forms
FOR SELECT TO authenticated
USING (
  is_current_user_admin()
  OR user_has_permission('Procurement')
  OR user_has_permission('Store Management')
  OR user_has_permission('Quality')
  OR user_has_permission('Logistics')
  OR created_by = current_user_email()
  OR created_by = (auth.uid())::text
);

DROP POLICY IF EXISTS "dmf_update_authenticated" ON public.dispatch_monitoring_forms;
CREATE POLICY "dmf_update_scoped" ON public.dispatch_monitoring_forms
FOR UPDATE TO authenticated
USING (
  is_current_user_admin()
  OR user_has_permission('Procurement')
  OR user_has_permission('Store Management')
  OR user_has_permission('Quality')
  OR user_has_permission('Logistics')
  OR created_by = current_user_email()
  OR created_by = (auth.uid())::text
);

-- field_assessment_suppliers
DROP POLICY IF EXISTS "Authenticated users can view all assessment suppliers" ON public.field_assessment_suppliers;
CREATE POLICY "Scoped read assessment suppliers" ON public.field_assessment_suppliers
FOR SELECT TO authenticated
USING (
  is_current_user_admin()
  OR user_has_permission('Field Operations')
  OR user_has_permission('Procurement')
  OR user_has_permission('Quality')
);

-- field_assessment_traders
DROP POLICY IF EXISTS "Authenticated users can view all assessment traders" ON public.field_assessment_traders;
CREATE POLICY "Scoped read assessment traders" ON public.field_assessment_traders
FOR SELECT TO authenticated
USING (
  is_current_user_admin()
  OR user_has_permission('Field Operations')
  OR user_has_permission('Procurement')
  OR user_has_permission('Quality')
);

-- weighbridge_scan_sessions
DROP POLICY IF EXISTS "Authenticated read weighbridge sessions" ON public.weighbridge_scan_sessions;
CREATE POLICY "Scoped read weighbridge sessions" ON public.weighbridge_scan_sessions
FOR SELECT TO authenticated
USING (
  is_current_user_admin()
  OR user_has_permission('Quality')
  OR user_has_permission('Store')
  OR user_has_permission('Store Management')
  OR user_has_permission('Procurement')
  OR user_has_permission('Finance')
  OR created_by = (auth.uid())::text
  OR created_by = current_user_email()
);
