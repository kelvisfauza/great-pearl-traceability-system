DROP POLICY IF EXISTS "Authenticated users can create dispatch reports" ON public.eudr_dispatch_reports;
CREATE POLICY "Logistics store admin can create dispatch reports"
ON public.eudr_dispatch_reports FOR INSERT TO authenticated
WITH CHECK (
  is_current_user_admin()
  OR user_has_permission('Logistics')
  OR user_has_permission('Store Management')
);

DROP POLICY IF EXISTS "Authenticated users can insert inventory batches" ON public.inventory_batches;
DROP POLICY IF EXISTS "Authenticated users can update inventory batches" ON public.inventory_batches;
CREATE POLICY "Inventory managers can insert inventory batches"
ON public.inventory_batches FOR INSERT TO authenticated
WITH CHECK (
  is_current_user_admin()
  OR user_has_permission('Store Management')
  OR user_has_permission('Procurement')
  OR user_has_permission('Finance')
  OR user_has_permission('Finance Management')
);
CREATE POLICY "Inventory managers can update inventory batches"
ON public.inventory_batches FOR UPDATE TO authenticated
USING (
  is_current_user_admin()
  OR user_has_permission('Store Management')
  OR user_has_permission('Procurement')
  OR user_has_permission('Finance')
  OR user_has_permission('Finance Management')
)
WITH CHECK (
  is_current_user_admin()
  OR user_has_permission('Store Management')
  OR user_has_permission('Procurement')
  OR user_has_permission('Finance')
  OR user_has_permission('Finance Management')
);

DROP POLICY IF EXISTS "Authenticated users can insert batch sources" ON public.inventory_batch_sources;
DROP POLICY IF EXISTS "Authenticated users can update batch sources" ON public.inventory_batch_sources;
DROP POLICY IF EXISTS "Authenticated users can delete batch sources" ON public.inventory_batch_sources;
CREATE POLICY "Inventory managers can insert batch sources"
ON public.inventory_batch_sources FOR INSERT TO authenticated
WITH CHECK (
  is_current_user_admin()
  OR user_has_permission('Store Management')
  OR user_has_permission('Procurement')
  OR user_has_permission('Finance')
  OR user_has_permission('Finance Management')
);
CREATE POLICY "Inventory managers can update batch sources"
ON public.inventory_batch_sources FOR UPDATE TO authenticated
USING (
  is_current_user_admin()
  OR user_has_permission('Store Management')
  OR user_has_permission('Procurement')
  OR user_has_permission('Finance')
  OR user_has_permission('Finance Management')
)
WITH CHECK (
  is_current_user_admin()
  OR user_has_permission('Store Management')
  OR user_has_permission('Procurement')
  OR user_has_permission('Finance')
  OR user_has_permission('Finance Management')
);
CREATE POLICY "Inventory managers can delete batch sources"
ON public.inventory_batch_sources FOR DELETE TO authenticated
USING (
  is_current_user_admin()
  OR user_has_permission('Store Management')
  OR user_has_permission('Procurement')
  OR user_has_permission('Finance')
  OR user_has_permission('Finance Management')
);

DROP POLICY IF EXISTS "Authenticated users can insert batch sales" ON public.inventory_batch_sales;
CREATE POLICY "Inventory managers can insert batch sales"
ON public.inventory_batch_sales FOR INSERT TO authenticated
WITH CHECK (
  is_current_user_admin()
  OR user_has_permission('Store Management')
  OR user_has_permission('Procurement')
  OR user_has_permission('Finance')
  OR user_has_permission('Finance Management')
  OR user_has_permission('Sales Marketing')
  OR user_has_permission('Sales')
);

DROP POLICY IF EXISTS "Authenticated users can create market intelligence reports" ON public.market_intelligence_reports;
DROP POLICY IF EXISTS "Authenticated users can update market intelligence reports" ON public.market_intelligence_reports;
CREATE POLICY "Analysts can create market intelligence reports"
ON public.market_intelligence_reports FOR INSERT TO authenticated
WITH CHECK (
  is_current_user_admin()
  OR user_has_permission('Procurement')
  OR user_has_permission('Finance')
  OR user_has_permission('Finance Management')
  OR user_has_permission('Data Analysis')
);
CREATE POLICY "Analysts can update market intelligence reports"
ON public.market_intelligence_reports FOR UPDATE TO authenticated
USING (
  is_current_user_admin()
  OR user_has_permission('Procurement')
  OR user_has_permission('Finance')
  OR user_has_permission('Finance Management')
  OR user_has_permission('Data Analysis')
)
WITH CHECK (
  is_current_user_admin()
  OR user_has_permission('Procurement')
  OR user_has_permission('Finance')
  OR user_has_permission('Finance Management')
  OR user_has_permission('Data Analysis')
);

DROP POLICY IF EXISTS "Authenticated users can insert calculations" ON public.price_calculation_history;
CREATE POLICY "Pricing roles can insert calculations"
ON public.price_calculation_history FOR INSERT TO authenticated
WITH CHECK (
  is_current_user_admin()
  OR user_has_permission('Procurement')
  OR user_has_permission('Finance')
  OR user_has_permission('Finance Management')
  OR user_has_permission('Data Analysis')
  OR user_has_permission('Quality Control')
);

DROP POLICY IF EXISTS "Authenticated users can insert metrics" ON public.metrics;
DROP POLICY IF EXISTS "Authenticated users can update metrics" ON public.metrics;
CREATE POLICY "Analysts can insert metrics"
ON public.metrics FOR INSERT TO authenticated
WITH CHECK (
  is_current_user_admin()
  OR user_has_permission('Data Analysis')
  OR user_has_permission('Finance')
  OR user_has_permission('Finance Management')
);
CREATE POLICY "Analysts can update metrics"
ON public.metrics FOR UPDATE TO authenticated
USING (
  is_current_user_admin()
  OR user_has_permission('Data Analysis')
  OR user_has_permission('Finance')
  OR user_has_permission('Finance Management')
)
WITH CHECK (
  is_current_user_admin()
  OR user_has_permission('Data Analysis')
  OR user_has_permission('Finance')
  OR user_has_permission('Finance Management')
);

DROP POLICY IF EXISTS "Allow authenticated users to insert supplier subcontracts" ON public.supplier_subcontracts;
DROP POLICY IF EXISTS "Allow authenticated users to update supplier subcontracts" ON public.supplier_subcontracts;
CREATE POLICY "Procurement finance admin can insert supplier subcontracts"
ON public.supplier_subcontracts FOR INSERT TO authenticated
WITH CHECK (
  is_current_user_admin()
  OR user_has_permission('Procurement')
  OR user_has_permission('Finance')
  OR user_has_permission('Finance Management')
);
CREATE POLICY "Procurement finance admin can update supplier subcontracts"
ON public.supplier_subcontracts FOR UPDATE TO authenticated
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