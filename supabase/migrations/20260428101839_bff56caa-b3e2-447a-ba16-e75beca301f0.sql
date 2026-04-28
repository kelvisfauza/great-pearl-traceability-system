
CREATE TABLE IF NOT EXISTS public.loan_evaluations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_email TEXT NOT NULL,
  employee_name TEXT,
  salary NUMERIC NOT NULL DEFAULT 0,
  max_limit NUMERIC NOT NULL DEFAULT 0,
  recommended_amount NUMERIC NOT NULL DEFAULT 0,
  recommended_loan_type TEXT,
  recommended_duration_months INTEGER,
  decision TEXT NOT NULL CHECK (decision IN ('approve','top_up','deny')),
  risk_score INTEGER NOT NULL DEFAULT 0,
  factors JSONB NOT NULL DEFAULT '[]'::jsonb,
  history_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  fee_amount NUMERIC NOT NULL DEFAULT 10000,
  fee_charged BOOLEAN NOT NULL DEFAULT false,
  fee_charged_at TIMESTAMPTZ,
  fee_charge_method TEXT,
  applied_loan_id UUID,
  valid_until TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loan_evaluations_email ON public.loan_evaluations(employee_email, created_at DESC);

ALTER TABLE public.loan_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own evaluations"
ON public.loan_evaluations FOR SELECT
USING (
  employee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR public.has_role(auth.uid(), 'Administrator'::app_role)
  OR public.has_role(auth.uid(), 'Super Admin'::app_role)
);

CREATE POLICY "Users insert own evaluations"
ON public.loan_evaluations FOR INSERT
WITH CHECK (
  employee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR public.has_role(auth.uid(), 'Administrator'::app_role)
  OR public.has_role(auth.uid(), 'Super Admin'::app_role)
);

CREATE POLICY "Admins update evaluations"
ON public.loan_evaluations FOR UPDATE
USING (
  public.has_role(auth.uid(), 'Administrator'::app_role)
  OR public.has_role(auth.uid(), 'Super Admin'::app_role)
);
