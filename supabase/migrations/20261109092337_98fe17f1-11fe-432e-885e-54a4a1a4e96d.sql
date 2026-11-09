ALTER POLICY "Operations can view coffee records" ON public.coffee_records USING ((select public.user_has_permission('Store Management')) OR (select public.user_has_permission('Quality Control')) OR (select public.user_has_permission('Finance')) OR (select public.is_current_user_admin()));
ALTER POLICY "Store management can manage coffee records" ON public.coffee_records USING ((select public.user_has_permission('Store Management')) OR (select public.is_current_user_admin()));
ALTER POLICY "Only admins can delete coffee_records" ON public.coffee_records USING ((select public.is_current_user_admin()));
ALTER POLICY "Admins HR IT can view all login tracker" ON public.employee_login_tracker USING ((select public.is_current_user_admin()) OR (select public.user_has_permission('Human Resources')) OR (select public.user_has_permission('IT')));
ALTER POLICY "Users can read own logins" ON public.employee_login_tracker USING ((select auth.uid()) = auth_user_id);
ALTER POLICY quality_postings_read ON public.quality_analysis_postings USING ((select public.can_view_quality_postings()));
CREATE INDEX IF NOT EXISTS idx_qap_status ON public.quality_analysis_postings(status);
CREATE INDEX IF NOT EXISTS idx_qap_received_at ON public.quality_analysis_postings(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_coffee_records_created_at ON public.coffee_records(created_at DESC, id);