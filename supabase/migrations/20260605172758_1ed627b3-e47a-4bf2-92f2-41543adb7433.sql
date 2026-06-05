
-- Monthly system-assigned overdraft eligibility limits
CREATE TABLE IF NOT EXISTS public.overdraft_eligibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  employee_email text NOT NULL,
  employee_name text,
  period text NOT NULL, -- 'YYYY-MM'
  computed_limit numeric NOT NULL DEFAULT 0,
  factors jsonb NOT NULL DEFAULT '{}'::jsonb,
  computed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_email, period)
);

GRANT SELECT ON public.overdraft_eligibility TO authenticated;
GRANT ALL ON public.overdraft_eligibility TO service_role;

ALTER TABLE public.overdraft_eligibility ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users see own eligibility"
ON public.overdraft_eligibility
FOR SELECT
TO authenticated
USING (
  employee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR public.has_role(auth.uid(), 'Administrator'::app_role)
  OR public.has_role(auth.uid(), 'Super Admin'::app_role)
);

CREATE INDEX IF NOT EXISTS idx_overdraft_eligibility_email ON public.overdraft_eligibility(employee_email);
CREATE INDEX IF NOT EXISTS idx_overdraft_eligibility_period ON public.overdraft_eligibility(period);

CREATE TRIGGER trg_overdraft_eligibility_updated_at
BEFORE UPDATE ON public.overdraft_eligibility
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
