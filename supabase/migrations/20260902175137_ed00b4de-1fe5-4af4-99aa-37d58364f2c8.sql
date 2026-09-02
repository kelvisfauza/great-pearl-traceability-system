CREATE TABLE public.procurement_daily_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'Africa/Kampala')::date,
  submitted_by_email TEXT NOT NULL,
  submitted_by_name TEXT,
  suppliers_visited INTEGER NOT NULL DEFAULT 0,
  kilograms_purchased NUMERIC NOT NULL DEFAULT 0,
  average_price NUMERIC NOT NULL DEFAULT 0,
  deliveries_expected TEXT,
  issues TEXT,
  observations TEXT NOT NULL,
  actions_taken TEXT,
  plan_next_day TEXT,
  market_notes TEXT,
  emailed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (report_date, submitted_by_email)
);

GRANT SELECT, INSERT, UPDATE ON public.procurement_daily_reports TO authenticated;
GRANT ALL ON public.procurement_daily_reports TO service_role;

ALTER TABLE public.procurement_daily_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can file their own procurement report"
ON public.procurement_daily_reports FOR INSERT TO authenticated
WITH CHECK (lower(submitted_by_email) = lower(public.current_user_email()));

CREATE POLICY "Staff can edit their own same-day report"
ON public.procurement_daily_reports FOR UPDATE TO authenticated
USING (lower(submitted_by_email) = lower(public.current_user_email())
       AND report_date = (now() AT TIME ZONE 'Africa/Kampala')::date)
WITH CHECK (lower(submitted_by_email) = lower(public.current_user_email()));

CREATE POLICY "Own reports and oversight roles can view"
ON public.procurement_daily_reports FOR SELECT TO authenticated
USING (
  lower(submitted_by_email) = lower(public.current_user_email())
  OR EXISTS (
    SELECT 1 FROM public.employees e
    WHERE lower(e.email) = lower(public.current_user_email())
      AND (
        lower(coalesce(e.role, '')) IN ('administrator', 'admin', 'super admin', 'manager')
        OR lower(coalesce(e.department, '')) IN ('administration', 'procurement', 'finance')
      )
  )
);

CREATE TRIGGER update_procurement_daily_reports_updated_at
BEFORE UPDATE ON public.procurement_daily_reports
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();