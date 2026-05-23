
-- Helper: is HR or admin
CREATE OR REPLACE FUNCTION public.is_hr_or_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.auth_user_id = auth.uid()
      AND (
        e.role IN ('Super Admin','Administrator','Manager')
        OR e.department ILIKE 'Human Resources%'
        OR e.department ILIKE 'HR%'
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_finance_or_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.auth_user_id = auth.uid()
      AND (
        e.role IN ('Super Admin','Administrator','Manager')
        OR e.department ILIKE 'Finance%'
      )
  );
$$;

-- 1) Restrict public-readable business tables to authenticated only
DROP POLICY IF EXISTS "Authenticated users can view inventory batches" ON public.inventory_batches;
CREATE POLICY "Authenticated users can view inventory batches" ON public.inventory_batches
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can view batch sales" ON public.inventory_batch_sales;
CREATE POLICY "Authenticated users can view batch sales" ON public.inventory_batch_sales
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can view batch sources" ON public.inventory_batch_sources;
CREATE POLICY "Authenticated users can view batch sources" ON public.inventory_batch_sources
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can view inventory movements" ON public.inventory_movements;
CREATE POLICY "Users can view inventory movements" ON public.inventory_movements
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can view market reports" ON public.market_reports;
CREATE POLICY "Authenticated users can view market reports" ON public.market_reports
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can view metrics" ON public.metrics;
CREATE POLICY "Authenticated users can view metrics" ON public.metrics
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can view price data" ON public.price_data;
CREATE POLICY "Authenticated users can view price data" ON public.price_data
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can view routes" ON public.delivery_routes;
CREATE POLICY "Authenticated users can view routes" ON public.delivery_routes
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow read access to coffee_booking_deliveries" ON public.coffee_booking_deliveries;
CREATE POLICY "Authenticated read coffee_booking_deliveries" ON public.coffee_booking_deliveries
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can read sessions" ON public.weighbridge_scan_sessions;
CREATE POLICY "Authenticated read weighbridge sessions" ON public.weighbridge_scan_sessions
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can read tickets" ON public.weighbridge_scanned_tickets;
CREATE POLICY "Authenticated read weighbridge tickets" ON public.weighbridge_scanned_tickets
FOR SELECT TO authenticated USING (true);

-- 2) call_signals: only sender/receiver
DROP POLICY IF EXISTS "Authenticated users can read call signals" ON public.call_signals;
CREATE POLICY "Participants can read their call signals" ON public.call_signals
FOR SELECT TO authenticated
USING (sender_id = auth.uid() OR receiver_id = auth.uid());

-- 3) edit_requests: requester or admin
DROP POLICY IF EXISTS "Authenticated can view edit requests" ON public.edit_requests;
CREATE POLICY "Requester or admin can view edit requests" ON public.edit_requests
FOR SELECT TO authenticated
USING (
  requested_by = public.get_current_user_email()
  OR public.is_current_user_admin()
);

-- 4) facilitation_requests: requester, finance or admin
DROP POLICY IF EXISTS "Authenticated can view facilitation_requests" ON public.facilitation_requests;
CREATE POLICY "Requester finance or admin view facilitation_requests" ON public.facilitation_requests
FOR SELECT TO authenticated
USING (
  requested_by = public.get_current_user_email()
  OR public.is_finance_or_admin()
);

-- 5) modification_requests: requester or admin/finance
DROP POLICY IF EXISTS "Authenticated can view modification requests" ON public.modification_requests;
CREATE POLICY "Requester or admin view modification requests" ON public.modification_requests
FOR SELECT TO authenticated
USING (
  requested_by = public.get_current_user_email()
  OR public.is_finance_or_admin()
);

-- 6) workflow_steps: admin/finance only
DROP POLICY IF EXISTS "Authenticated can view workflow steps" ON public.workflow_steps;
CREATE POLICY "Admin or finance view workflow steps" ON public.workflow_steps
FOR SELECT TO authenticated
USING (public.is_finance_or_admin());

-- 7) job_applications: HR/admin only
DROP POLICY IF EXISTS "Authenticated users can view job applications" ON public.job_applications;
CREATE POLICY "HR or admin view job applications" ON public.job_applications
FOR SELECT TO authenticated
USING (public.is_hr_or_admin());
