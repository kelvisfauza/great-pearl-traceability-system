CREATE TABLE public.salary_auto_invest (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  invest_type TEXT NOT NULL DEFAULT 'fixed' CHECK (invest_type IN ('fixed', 'percentage')),
  fixed_amount NUMERIC DEFAULT 0,
  percentage NUMERIC DEFAULT 0,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  last_processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.salary_auto_invest ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own auto-invest" ON public.salary_auto_invest
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create own auto-invest" ON public.salary_auto_invest
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own auto-invest" ON public.salary_auto_invest
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Service role full access" ON public.salary_auto_invest
  FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_salary_auto_invest_updated_at
  BEFORE UPDATE ON public.salary_auto_invest
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();