CREATE OR REPLACE FUNCTION public.selected_staff_module_access(p_modules text[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT public.is_active_staff() AND (
  EXISTS(SELECT 1 FROM public.user_roles ur WHERE ur.user_id=auth.uid() AND ur.role IN ('admin','super_admin')) OR
  EXISTS(SELECT 1 FROM public.employees e CROSS JOIN LATERAL unnest(coalesce(e.permissions,ARRAY[]::text[])) p(permission)
   WHERE lower(e.email)=lower(auth.jwt()->>'email') AND (p.permission IN ('*','Administration') OR EXISTS(
    SELECT 1 FROM unnest(p_modules) m(module) WHERE p.permission=m.module OR left(p.permission,length(m.module)+1)=m.module||':')))
 );
$$;
REVOKE ALL ON FUNCTION public.selected_staff_module_access(text[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.selected_staff_module_access(text[]) TO authenticated,service_role;
DROP POLICY "Authenticated can view eudr_batch_sales" ON public.eudr_batch_sales;
DROP POLICY "Authenticated can view eudr_documents" ON public.eudr_documents;
DROP POLICY "Authenticated can view eudr_sales" ON public.eudr_sales;
DROP POLICY "Authenticated can view eudr_batches" ON public.eudr_batches;
DROP POLICY "Authenticated can view vehicle_trips" ON public.vehicle_trips;
DROP POLICY "Authenticated can view price_forecasts" ON public.price_forecasts;
ALTER POLICY "Authenticated users can view vehicles" ON public.vehicles TO authenticated USING(public.selected_staff_module_access(ARRAY['Logistics','Procurement','Store Management']));
ALTER POLICY "Authenticated can view holidays" ON public.public_holidays TO authenticated USING(public.is_active_staff());
ALTER POLICY "Authenticated users can view defect_library" ON public.defect_library TO authenticated USING(public.is_active_staff());
ALTER POLICY "v3_coffee_types_read" ON public.v3_coffee_types TO authenticated USING(EXISTS(SELECT 1 FROM public.v3_user_roles r WHERE r.user_id=auth.uid() AND (r.expires_at IS NULL OR r.expires_at>now())));
ALTER POLICY "v3_standards_read" ON public.v3_quality_standards TO authenticated USING(EXISTS(SELECT 1 FROM public.v3_user_roles r WHERE r.user_id=auth.uid() AND (r.expires_at IS NULL OR r.expires_at>now())));
DROP POLICY "Anyone can insert reports" ON public.reports;
ALTER POLICY "Authenticated users can insert routes" ON public.delivery_routes TO authenticated WITH CHECK(public.selected_staff_module_access(ARRAY['Logistics','Procurement','Store Management']));
ALTER POLICY "Authenticated users can insert store_reports" ON public.store_reports TO authenticated WITH CHECK(public.is_active_staff() AND (lower(input_by)=lower(auth.jwt()->>'email') OR EXISTS(SELECT 1 FROM public.employees e WHERE lower(e.email)=lower(auth.jwt()->>'email') AND e.name=store_reports.input_by)));
ALTER POLICY "Authenticated users can insert rejected_coffee" ON public.rejected_coffee TO authenticated WITH CHECK(public.is_active_staff() AND (lower(reported_by)=lower(auth.jwt()->>'email') OR EXISTS(SELECT 1 FROM public.employees e WHERE lower(e.email)=lower(auth.jwt()->>'email') AND e.name=rejected_coffee.reported_by)));
ALTER POLICY "Authenticated users can insert quality_performance_tracking" ON public.quality_performance_tracking TO service_role WITH CHECK(true);