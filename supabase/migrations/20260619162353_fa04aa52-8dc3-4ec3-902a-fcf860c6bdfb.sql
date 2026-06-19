
-- Restrict writes on payment-related tables to Finance/Admin
DROP POLICY IF EXISTS "Authenticated users can insert meal disbursements" ON public.meal_disbursements;
DROP POLICY IF EXISTS "Authenticated users can update meal disbursements" ON public.meal_disbursements;

CREATE POLICY "Finance and Admin can insert meal disbursements"
  ON public.meal_disbursements FOR INSERT
  WITH CHECK (user_has_permission('Finance Management') OR user_has_permission('Finance') OR is_current_user_admin());

CREATE POLICY "Finance and Admin can update meal disbursements"
  ON public.meal_disbursements FOR UPDATE
  USING (user_has_permission('Finance Management') OR user_has_permission('Finance') OR is_current_user_admin())
  WITH CHECK (user_has_permission('Finance Management') OR user_has_permission('Finance') OR is_current_user_admin());

DROP POLICY IF EXISTS "Authenticated users can insert service provider payments" ON public.service_provider_payments;
DROP POLICY IF EXISTS "Service role can update service provider payments" ON public.service_provider_payments;

CREATE POLICY "Finance and Admin can insert service provider payments"
  ON public.service_provider_payments FOR INSERT
  WITH CHECK (user_has_permission('Finance Management') OR user_has_permission('Finance') OR is_current_user_admin());

CREATE POLICY "Finance and Admin can update service provider payments"
  ON public.service_provider_payments FOR UPDATE
  USING (user_has_permission('Finance Management') OR user_has_permission('Finance') OR is_current_user_admin())
  WITH CHECK (user_has_permission('Finance Management') OR user_has_permission('Finance') OR is_current_user_admin());

DROP POLICY IF EXISTS "Authenticated users can insert service providers" ON public.service_providers;
DROP POLICY IF EXISTS "Authenticated users can update service providers" ON public.service_providers;
DROP POLICY IF EXISTS "Authenticated users can delete service providers" ON public.service_providers;

CREATE POLICY "Finance Admin and Procurement insert service providers"
  ON public.service_providers FOR INSERT
  WITH CHECK (user_has_permission('Finance Management') OR user_has_permission('Finance') OR user_has_permission('Procurement') OR is_current_user_admin());

CREATE POLICY "Finance Admin and Procurement update service providers"
  ON public.service_providers FOR UPDATE
  USING (user_has_permission('Finance Management') OR user_has_permission('Finance') OR user_has_permission('Procurement') OR is_current_user_admin())
  WITH CHECK (user_has_permission('Finance Management') OR user_has_permission('Finance') OR user_has_permission('Procurement') OR is_current_user_admin());

CREATE POLICY "Finance Management and Admin delete service providers"
  ON public.service_providers FOR DELETE
  USING (user_has_permission('Finance Management') OR is_current_user_admin());
