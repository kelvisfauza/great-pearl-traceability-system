CREATE TABLE IF NOT EXISTS public.salary_remittance_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id text,
  employee_email text NOT NULL,
  employee_name text,
  recipient_name text NOT NULL,
  recipient_phone text NOT NULL,
  percentage numeric(5,2) NOT NULL CHECK (percentage > 0 AND percentage <= 100),
  status text NOT NULL DEFAULT 'active',
  notes text,
  agreement_date date NOT NULL DEFAULT CURRENT_DATE,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_remit_agreements_email ON public.salary_remittance_agreements(employee_email);
CREATE INDEX IF NOT EXISTS idx_remit_agreements_status ON public.salary_remittance_agreements(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.salary_remittance_agreements TO authenticated;
GRANT ALL ON public.salary_remittance_agreements TO service_role;

ALTER TABLE public.salary_remittance_agreements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage remittance agreements" ON public.salary_remittance_agreements
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'Super Admin'::app_role)
    OR public.has_role(auth.uid(), 'Administrator'::app_role)
    OR public.has_role(auth.uid(), 'finance_manager'::app_role)
    OR public.has_role(auth.uid(), 'finance_assistant'::app_role)
    OR public.has_role(auth.uid(), 'accountant'::app_role)
    OR EXISTS (SELECT 1 FROM public.employees e
      WHERE e.auth_user_id = auth.uid()
        AND lower(coalesce(e.department,'')) IN ('hr','human resources','finance','administrator','administration'))
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'Super Admin'::app_role)
    OR public.has_role(auth.uid(), 'Administrator'::app_role)
    OR public.has_role(auth.uid(), 'finance_manager'::app_role)
    OR public.has_role(auth.uid(), 'finance_assistant'::app_role)
    OR public.has_role(auth.uid(), 'accountant'::app_role)
    OR EXISTS (SELECT 1 FROM public.employees e
      WHERE e.auth_user_id = auth.uid()
        AND lower(coalesce(e.department,'')) IN ('hr','human resources','finance','administrator','administration'))
  );

CREATE POLICY "Employees view own agreements" ON public.salary_remittance_agreements
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.employees e
      WHERE e.auth_user_id = auth.uid()
        AND lower(e.email) = lower(salary_remittance_agreements.employee_email))
  );

CREATE TRIGGER trg_remit_agreements_updated BEFORE UPDATE ON public.salary_remittance_agreements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.salary_remittance_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id uuid REFERENCES public.salary_remittance_agreements(id) ON DELETE SET NULL,
  payroll_run_id uuid,
  employee_email text NOT NULL,
  employee_name text,
  month text NOT NULL,
  recipient_name text,
  recipient_phone text NOT NULL,
  net_salary numeric NOT NULL,
  percentage numeric(5,2) NOT NULL,
  amount numeric NOT NULL,
  yo_reference text,
  yo_status text DEFAULT 'pending',
  yo_raw_response text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_remit_pay_email ON public.salary_remittance_payments(employee_email);
CREATE INDEX IF NOT EXISTS idx_remit_pay_month ON public.salary_remittance_payments(month);

GRANT SELECT, INSERT, UPDATE ON public.salary_remittance_payments TO authenticated;
GRANT ALL ON public.salary_remittance_payments TO service_role;

ALTER TABLE public.salary_remittance_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage remittance payments" ON public.salary_remittance_payments
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'Super Admin'::app_role)
    OR public.has_role(auth.uid(), 'Administrator'::app_role)
    OR public.has_role(auth.uid(), 'finance_manager'::app_role)
    OR public.has_role(auth.uid(), 'finance_assistant'::app_role)
    OR public.has_role(auth.uid(), 'accountant'::app_role)
    OR EXISTS (SELECT 1 FROM public.employees e
      WHERE e.auth_user_id = auth.uid()
        AND lower(coalesce(e.department,'')) IN ('hr','human resources','finance','administrator','administration'))
  )
  WITH CHECK (true);

CREATE POLICY "Employees view own remittance payments" ON public.salary_remittance_payments
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.employees e
      WHERE e.auth_user_id = auth.uid()
        AND lower(e.email) = lower(salary_remittance_payments.employee_email))
  );

CREATE TRIGGER trg_remit_payments_updated BEFORE UPDATE ON public.salary_remittance_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();