CREATE TABLE public.monthly_allowances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_email text NOT NULL,
  employee_name text NOT NULL,
  allowance_type text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.monthly_allowances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage monthly allowances"
  ON public.monthly_allowances FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.auth_user_id = auth.uid()
      AND employees.role IN ('Super Admin', 'Administrator')
    )
  );

CREATE TRIGGER update_monthly_allowances_updated_at
  BEFORE UPDATE ON public.monthly_allowances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE public.monthly_allowance_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_email text NOT NULL,
  employee_name text NOT NULL,
  allowance_type text NOT NULL,
  amount numeric NOT NULL,
  ledger_reference text,
  sms_sent boolean DEFAULT false,
  processed_at timestamptz DEFAULT now(),
  month_year text NOT NULL
);

ALTER TABLE public.monthly_allowance_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view allowance logs"
  ON public.monthly_allowance_log FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.auth_user_id = auth.uid()
      AND employees.role IN ('Super Admin', 'Administrator')
    )
  );