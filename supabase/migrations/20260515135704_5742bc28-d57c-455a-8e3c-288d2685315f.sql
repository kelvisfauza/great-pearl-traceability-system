
ALTER TABLE public.employee_salary_payments
  ADD COLUMN IF NOT EXISTS nssf_employee numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nssf_employer numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nssf_total numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS taxable_income numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paye numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS disbursement_reference text,
  ADD COLUMN IF NOT EXISTS approved_by text,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS payroll_run_id uuid;

CREATE TABLE IF NOT EXISTS public.payroll_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  total_gross numeric NOT NULL DEFAULT 0,
  total_nssf_employee numeric NOT NULL DEFAULT 0,
  total_nssf_employer numeric NOT NULL DEFAULT 0,
  total_paye numeric NOT NULL DEFAULT 0,
  total_net numeric NOT NULL DEFAULT 0,
  employee_count integer NOT NULL DEFAULT 0,
  created_by text,
  created_by_email text,
  approved_by text,
  approved_by_email text,
  approved_at timestamptz,
  disbursed_at timestamptz,
  notes text,
  preview jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_month ON public.payroll_runs(month);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_status ON public.payroll_runs(status);

ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff manage payroll runs" ON public.payroll_runs;
CREATE POLICY "Staff manage payroll runs" ON public.payroll_runs
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'Super Admin'::app_role)
    OR public.has_role(auth.uid(), 'Administrator'::app_role)
    OR public.has_role(auth.uid(), 'finance_manager'::app_role)
    OR public.has_role(auth.uid(), 'finance_assistant'::app_role)
    OR public.has_role(auth.uid(), 'accountant'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.auth_user_id = auth.uid()
        AND lower(coalesce(e.department,'')) IN ('hr','human resources','finance','administrator','administration')
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'Super Admin'::app_role)
    OR public.has_role(auth.uid(), 'Administrator'::app_role)
    OR public.has_role(auth.uid(), 'finance_manager'::app_role)
    OR public.has_role(auth.uid(), 'finance_assistant'::app_role)
    OR public.has_role(auth.uid(), 'accountant'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.auth_user_id = auth.uid()
        AND lower(coalesce(e.department,'')) IN ('hr','human resources','finance','administrator','administration')
    )
  );

CREATE TABLE IF NOT EXISTS public.statutory_liabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id uuid REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
  salary_payment_id uuid,
  employee_id text,
  employee_name text,
  employee_email text,
  month text NOT NULL,
  type text NOT NULL CHECK (type IN ('nssf_employee','nssf_employer','paye')),
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  remitted_at timestamptz,
  remittance_ref text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stat_liab_run ON public.statutory_liabilities(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_stat_liab_month ON public.statutory_liabilities(month);
CREATE INDEX IF NOT EXISTS idx_stat_liab_employee ON public.statutory_liabilities(employee_id);
CREATE INDEX IF NOT EXISTS idx_stat_liab_type ON public.statutory_liabilities(type);

ALTER TABLE public.statutory_liabilities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff manage statutory liabilities" ON public.statutory_liabilities;
CREATE POLICY "Staff manage statutory liabilities" ON public.statutory_liabilities
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'Super Admin'::app_role)
    OR public.has_role(auth.uid(), 'Administrator'::app_role)
    OR public.has_role(auth.uid(), 'finance_manager'::app_role)
    OR public.has_role(auth.uid(), 'finance_assistant'::app_role)
    OR public.has_role(auth.uid(), 'accountant'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.auth_user_id = auth.uid()
        AND lower(coalesce(e.department,'')) IN ('hr','human resources','finance','administrator','administration')
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'Super Admin'::app_role)
    OR public.has_role(auth.uid(), 'Administrator'::app_role)
    OR public.has_role(auth.uid(), 'finance_manager'::app_role)
    OR public.has_role(auth.uid(), 'finance_assistant'::app_role)
    OR public.has_role(auth.uid(), 'accountant'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.auth_user_id = auth.uid()
        AND lower(coalesce(e.department,'')) IN ('hr','human resources','finance','administrator','administration')
    )
  );

DROP POLICY IF EXISTS "Employees view own statutory liabilities" ON public.statutory_liabilities;
CREATE POLICY "Employees view own statutory liabilities" ON public.statutory_liabilities
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.auth_user_id = auth.uid()
        AND (e.id::text = statutory_liabilities.employee_id OR lower(e.email) = lower(coalesce(statutory_liabilities.employee_email,'')))
    )
  );

CREATE TABLE IF NOT EXISTS public.employee_tax_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id text UNIQUE NOT NULL,
  tin text,
  nssf_number text,
  nssf_exempt boolean NOT NULL DEFAULT false,
  paye_exempt boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_tax_profile ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff manage tax profile" ON public.employee_tax_profile;
CREATE POLICY "Staff manage tax profile" ON public.employee_tax_profile
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'Super Admin'::app_role)
    OR public.has_role(auth.uid(), 'Administrator'::app_role)
    OR public.has_role(auth.uid(), 'finance_manager'::app_role)
    OR public.has_role(auth.uid(), 'finance_assistant'::app_role)
    OR public.has_role(auth.uid(), 'accountant'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.auth_user_id = auth.uid()
        AND lower(coalesce(e.department,'')) IN ('hr','human resources','finance','administrator','administration')
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'Super Admin'::app_role)
    OR public.has_role(auth.uid(), 'Administrator'::app_role)
    OR public.has_role(auth.uid(), 'finance_manager'::app_role)
    OR public.has_role(auth.uid(), 'finance_assistant'::app_role)
    OR public.has_role(auth.uid(), 'accountant'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.auth_user_id = auth.uid()
        AND lower(coalesce(e.department,'')) IN ('hr','human resources','finance','administrator','administration')
    )
  );

DROP POLICY IF EXISTS "Employees view own tax profile" ON public.employee_tax_profile;
CREATE POLICY "Employees view own tax profile" ON public.employee_tax_profile
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.auth_user_id = auth.uid()
        AND e.id::text = employee_tax_profile.employee_id
    )
  );

DROP TRIGGER IF EXISTS trg_payroll_runs_updated ON public.payroll_runs;
CREATE TRIGGER trg_payroll_runs_updated BEFORE UPDATE ON public.payroll_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_stat_liab_updated ON public.statutory_liabilities;
CREATE TRIGGER trg_stat_liab_updated BEFORE UPDATE ON public.statutory_liabilities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_tax_profile_updated ON public.employee_tax_profile;
CREATE TRIGGER trg_tax_profile_updated BEFORE UPDATE ON public.employee_tax_profile
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
