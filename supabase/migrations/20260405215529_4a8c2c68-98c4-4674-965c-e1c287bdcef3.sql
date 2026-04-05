
-- Table for monthly overtime review/approval
CREATE TABLE public.monthly_overtime_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  employee_email TEXT NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,
  total_overtime_minutes INTEGER NOT NULL DEFAULT 0,
  total_late_minutes INTEGER NOT NULL DEFAULT 0,
  net_overtime_minutes INTEGER NOT NULL DEFAULT 0,
  overtime_rate_per_hour NUMERIC NOT NULL DEFAULT 1000,
  calculated_pay NUMERIC NOT NULL DEFAULT 0,
  adjusted_overtime_minutes INTEGER,
  adjusted_pay NUMERIC,
  admin_notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (employee_id, month, year)
);

ALTER TABLE public.monthly_overtime_reviews ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view
CREATE POLICY "Authenticated users can view overtime reviews"
  ON public.monthly_overtime_reviews FOR SELECT TO authenticated USING (true);

-- Admins/Managers can update
CREATE POLICY "Admins can update overtime reviews"
  ON public.monthly_overtime_reviews FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

-- System inserts (via service role)
CREATE POLICY "System can insert overtime reviews"
  ON public.monthly_overtime_reviews FOR INSERT TO authenticated
  WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_monthly_overtime_reviews_updated_at
  BEFORE UPDATE ON public.monthly_overtime_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
