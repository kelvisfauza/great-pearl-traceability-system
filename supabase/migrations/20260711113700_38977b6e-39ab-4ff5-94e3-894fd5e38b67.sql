
DROP POLICY IF EXISTS "Authenticated users can insert field_purchases" ON public.field_purchases;
DROP POLICY IF EXISTS "Authenticated users can update field_purchases" ON public.field_purchases;

DROP POLICY IF EXISTS "Anyone can insert store records" ON public.store_records;
DROP POLICY IF EXISTS "Anyone can update store records" ON public.store_records;
CREATE POLICY "Store management can insert store records" ON public.store_records
  FOR INSERT TO authenticated
  WITH CHECK (user_has_permission('Store Management') OR is_current_user_admin());
CREATE POLICY "Store management can update store records" ON public.store_records
  FOR UPDATE TO authenticated
  USING (user_has_permission('Store Management') OR is_current_user_admin())
  WITH CHECK (user_has_permission('Store Management') OR is_current_user_admin());

DROP POLICY IF EXISTS "Anyone can insert suppliers" ON public.suppliers;

DROP POLICY IF EXISTS "Authenticated can view market prices" ON public.market_prices;
CREATE POLICY "Pricing roles can view market prices" ON public.market_prices
  FOR SELECT TO authenticated
  USING (
    price_type = 'reference_prices'
    OR user_has_permission('Finance')
    OR user_has_permission('Finance Management')
    OR user_has_permission('Procurement')
    OR is_current_user_admin()
  );

DROP POLICY IF EXISTS "Anyone can insert coffee_records" ON public.coffee_records;

DROP POLICY IF EXISTS "Allow insert to coffee_bookings" ON public.coffee_bookings;
DROP POLICY IF EXISTS "Allow update to coffee_bookings" ON public.coffee_bookings;
CREATE POLICY "Procurement can insert coffee_bookings" ON public.coffee_bookings
  FOR INSERT TO authenticated
  WITH CHECK (user_has_permission('Procurement') OR user_has_permission('Store Management') OR is_current_user_admin());
CREATE POLICY "Procurement can update coffee_bookings" ON public.coffee_bookings
  FOR UPDATE TO authenticated
  USING (user_has_permission('Procurement') OR user_has_permission('Store Management') OR is_current_user_admin())
  WITH CHECK (user_has_permission('Procurement') OR user_has_permission('Store Management') OR is_current_user_admin());

DROP POLICY IF EXISTS "Authenticated users can insert sales tracking" ON public.sales_inventory_tracking;
CREATE POLICY "Sales roles can insert sales tracking" ON public.sales_inventory_tracking
  FOR INSERT TO authenticated
  WITH CHECK (user_has_permission('Sales Marketing') OR user_has_permission('Sales') OR user_has_permission('Store Management') OR user_has_permission('Finance') OR is_current_user_admin());

DROP POLICY IF EXISTS "Authenticated users can insert quick analyses" ON public.quick_analyses;
DROP POLICY IF EXISTS "Authenticated users can update quick analyses" ON public.quick_analyses;
DROP POLICY IF EXISTS "Authenticated users can delete quick analyses" ON public.quick_analyses;
CREATE POLICY "Quality roles can insert quick analyses" ON public.quick_analyses
  FOR INSERT TO authenticated
  WITH CHECK (user_has_permission('Quality Control') OR user_has_permission('Quality') OR user_has_permission('Procurement') OR is_current_user_admin());
CREATE POLICY "Quality roles can update quick analyses" ON public.quick_analyses
  FOR UPDATE TO authenticated
  USING (user_has_permission('Quality Control') OR user_has_permission('Quality') OR user_has_permission('Procurement') OR is_current_user_admin())
  WITH CHECK (user_has_permission('Quality Control') OR user_has_permission('Quality') OR user_has_permission('Procurement') OR is_current_user_admin());
CREATE POLICY "Admins can delete quick analyses" ON public.quick_analyses
  FOR DELETE TO authenticated
  USING (is_current_user_admin());

DROP POLICY IF EXISTS "Authenticated users can insert market reports" ON public.market_reports;
DROP POLICY IF EXISTS "Authenticated users can update market reports" ON public.market_reports;
CREATE POLICY "Pricing roles can insert market reports" ON public.market_reports
  FOR INSERT TO authenticated
  WITH CHECK (user_has_permission('Procurement') OR user_has_permission('Finance') OR user_has_permission('Finance Management') OR is_current_user_admin());
CREATE POLICY "Pricing roles can update market reports" ON public.market_reports
  FOR UPDATE TO authenticated
  USING (user_has_permission('Procurement') OR user_has_permission('Finance') OR user_has_permission('Finance Management') OR is_current_user_admin())
  WITH CHECK (user_has_permission('Procurement') OR user_has_permission('Finance') OR user_has_permission('Finance Management') OR is_current_user_admin());

DROP POLICY IF EXISTS "Authenticated users can insert warehouse_quality_monitoring" ON public.warehouse_quality_monitoring;
CREATE POLICY "Quality roles can insert warehouse monitoring" ON public.warehouse_quality_monitoring
  FOR INSERT TO authenticated
  WITH CHECK (user_has_permission('Quality Control') OR user_has_permission('Quality') OR user_has_permission('Store Management') OR is_current_user_admin());

DROP POLICY IF EXISTS "Authenticated users can insert training_simulations" ON public.training_simulations;
DROP POLICY IF EXISTS "Authenticated users can update training_simulations" ON public.training_simulations;
CREATE POLICY "Quality roles can insert training_simulations" ON public.training_simulations
  FOR INSERT TO authenticated
  WITH CHECK (user_has_permission('Quality Control') OR user_has_permission('Quality') OR is_current_user_admin());
CREATE POLICY "Quality roles can update training_simulations" ON public.training_simulations
  FOR UPDATE TO authenticated
  USING (user_has_permission('Quality Control') OR user_has_permission('Quality') OR is_current_user_admin())
  WITH CHECK (user_has_permission('Quality Control') OR user_has_permission('Quality') OR is_current_user_admin());

DROP POLICY IF EXISTS "Authenticated users can insert weekly_reports" ON public.weekly_reports;
CREATE POLICY "Users can submit own weekly_reports" ON public.weekly_reports
  FOR INSERT TO authenticated
  WITH CHECK (submitted_by = auth.uid()::text OR is_current_user_admin());

DROP POLICY IF EXISTS "Authenticated users can insert vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Authenticated users can update vehicles" ON public.vehicles;
CREATE POLICY "Logistics can insert vehicles" ON public.vehicles
  FOR INSERT TO authenticated
  WITH CHECK (user_has_permission('Logistics') OR user_has_permission('Store Management') OR is_current_user_admin());
CREATE POLICY "Logistics can update vehicles" ON public.vehicles
  FOR UPDATE TO authenticated
  USING (user_has_permission('Logistics') OR user_has_permission('Store Management') OR is_current_user_admin())
  WITH CHECK (user_has_permission('Logistics') OR user_has_permission('Store Management') OR is_current_user_admin());

DROP POLICY IF EXISTS "Authenticated users can insert shipments" ON public.shipments;
DROP POLICY IF EXISTS "Authenticated users can update shipments" ON public.shipments;
CREATE POLICY "Operations can insert shipments" ON public.shipments
  FOR INSERT TO authenticated
  WITH CHECK (user_has_permission('Sales Marketing') OR user_has_permission('Sales') OR user_has_permission('Logistics') OR user_has_permission('Finance') OR is_current_user_admin());
CREATE POLICY "Operations can update shipments" ON public.shipments
  FOR UPDATE TO authenticated
  USING (user_has_permission('Sales Marketing') OR user_has_permission('Sales') OR user_has_permission('Logistics') OR user_has_permission('Finance') OR is_current_user_admin())
  WITH CHECK (user_has_permission('Sales Marketing') OR user_has_permission('Sales') OR user_has_permission('Logistics') OR user_has_permission('Finance') OR is_current_user_admin());
