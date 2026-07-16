
-- ============ EUDR TABLES ============
DROP POLICY IF EXISTS "Anyone can manage EUDR batches" ON public.eudr_batches;
CREATE POLICY "Authenticated can view eudr_batches" ON public.eudr_batches
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Compliance staff manage eudr_batches" ON public.eudr_batches
  FOR ALL
  USING (
    public.is_current_user_admin()
    OR public.user_has_permission('Quality Control')
    OR public.user_has_permission('Procurement')
    OR public.user_has_permission('EUDR Documentation')
    OR public.user_has_permission('Store Management')
  )
  WITH CHECK (
    public.is_current_user_admin()
    OR public.user_has_permission('Quality Control')
    OR public.user_has_permission('Procurement')
    OR public.user_has_permission('EUDR Documentation')
    OR public.user_has_permission('Store Management')
  );

DROP POLICY IF EXISTS "Anyone can manage EUDR documents" ON public.eudr_documents;
CREATE POLICY "Authenticated can view eudr_documents" ON public.eudr_documents
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Compliance staff manage eudr_documents" ON public.eudr_documents
  FOR ALL
  USING (
    public.is_current_user_admin()
    OR public.user_has_permission('Quality Control')
    OR public.user_has_permission('Procurement')
    OR public.user_has_permission('EUDR Documentation')
    OR public.user_has_permission('Store Management')
  )
  WITH CHECK (
    public.is_current_user_admin()
    OR public.user_has_permission('Quality Control')
    OR public.user_has_permission('Procurement')
    OR public.user_has_permission('EUDR Documentation')
    OR public.user_has_permission('Store Management')
  );

DROP POLICY IF EXISTS "Anyone can manage EUDR sales" ON public.eudr_sales;
CREATE POLICY "Authenticated can view eudr_sales" ON public.eudr_sales
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Compliance staff manage eudr_sales" ON public.eudr_sales
  FOR ALL
  USING (
    public.is_current_user_admin()
    OR public.user_has_permission('Quality Control')
    OR public.user_has_permission('Procurement')
    OR public.user_has_permission('EUDR Documentation')
    OR public.user_has_permission('Sales Marketing')
  )
  WITH CHECK (
    public.is_current_user_admin()
    OR public.user_has_permission('Quality Control')
    OR public.user_has_permission('Procurement')
    OR public.user_has_permission('EUDR Documentation')
    OR public.user_has_permission('Sales Marketing')
  );

DROP POLICY IF EXISTS "Authenticated users can manage eudr_batch_sales" ON public.eudr_batch_sales;
CREATE POLICY "Authenticated can view eudr_batch_sales" ON public.eudr_batch_sales
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Compliance staff manage eudr_batch_sales" ON public.eudr_batch_sales
  FOR ALL
  USING (
    public.is_current_user_admin()
    OR public.user_has_permission('Quality Control')
    OR public.user_has_permission('Procurement')
    OR public.user_has_permission('EUDR Documentation')
    OR public.user_has_permission('Sales Marketing')
  )
  WITH CHECK (
    public.is_current_user_admin()
    OR public.user_has_permission('Quality Control')
    OR public.user_has_permission('Procurement')
    OR public.user_has_permission('EUDR Documentation')
    OR public.user_has_permission('Sales Marketing')
  );

-- ============ PRICE DATA ============
DROP POLICY IF EXISTS "Anyone can insert price data" ON public.price_data;
DROP POLICY IF EXISTS "Anyone can update price data" ON public.price_data;
CREATE POLICY "Finance staff insert price data" ON public.price_data
  FOR INSERT
  WITH CHECK (
    public.is_current_user_admin()
    OR public.user_has_permission('Finance')
    OR public.user_has_permission('Procurement')
    OR public.user_has_permission('Data Analysis')
  );
CREATE POLICY "Finance staff update price data" ON public.price_data
  FOR UPDATE
  USING (
    public.is_current_user_admin()
    OR public.user_has_permission('Finance')
    OR public.user_has_permission('Procurement')
    OR public.user_has_permission('Data Analysis')
  )
  WITH CHECK (
    public.is_current_user_admin()
    OR public.user_has_permission('Finance')
    OR public.user_has_permission('Procurement')
    OR public.user_has_permission('Data Analysis')
  );

-- ============ PRICE FORECASTS ============
DROP POLICY IF EXISTS "Anyone can manage price_forecasts" ON public.price_forecasts;
CREATE POLICY "Authenticated can view price_forecasts" ON public.price_forecasts
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Finance staff manage price_forecasts" ON public.price_forecasts
  FOR ALL
  USING (
    public.is_current_user_admin()
    OR public.user_has_permission('Finance')
    OR public.user_has_permission('Procurement')
    OR public.user_has_permission('Data Analysis')
  )
  WITH CHECK (
    public.is_current_user_admin()
    OR public.user_has_permission('Finance')
    OR public.user_has_permission('Procurement')
    OR public.user_has_permission('Data Analysis')
  );

-- ============ SMS LOGS ============
-- Only admins/IT Management can insert from client. Edge functions use the
-- service role which bypasses RLS, so system-triggered SMS logs still work.
DROP POLICY IF EXISTS "Authenticated insert sms_logs" ON public.sms_logs;
CREATE POLICY "Admins insert sms_logs" ON public.sms_logs
  FOR INSERT
  WITH CHECK (
    public.is_current_user_admin()
    OR public.user_has_permission('IT Management')
  );

-- ============ VEHICLE TRIPS ============
DROP POLICY IF EXISTS "Authenticated users can manage vehicle trips" ON public.vehicle_trips;
CREATE POLICY "Authenticated can view vehicle_trips" ON public.vehicle_trips
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Logistics staff manage vehicle_trips" ON public.vehicle_trips
  FOR ALL
  USING (
    public.is_current_user_admin()
    OR public.user_has_permission('Logistics')
    OR public.user_has_permission('Procurement')
  )
  WITH CHECK (
    public.is_current_user_admin()
    OR public.user_has_permission('Logistics')
    OR public.user_has_permission('Procurement')
  );
