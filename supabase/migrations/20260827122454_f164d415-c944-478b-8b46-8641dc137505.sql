CREATE TABLE public.employee_suspensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid,
  employee_name text NOT NULL,
  employee_email text NOT NULL,
  employee_phone text,
  reason text NOT NULL,
  details text,
  pay_status text NOT NULL DEFAULT 'half_pay',
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date NOT NULL,
  report_back_date date,
  letter_body text,
  status text NOT NULL DEFAULT 'active',
  issued_by text,
  lifted_by text,
  lifted_at timestamptz,
  lift_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_suspensions TO authenticated;
GRANT ALL ON public.employee_suspensions TO service_role;

ALTER TABLE public.employee_suspensions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and HR manage suspensions"
ON public.employee_suspensions FOR ALL TO authenticated
USING (public.is_admin_or_hr())
WITH CHECK (public.is_admin_or_hr());

CREATE POLICY "Employees view own suspensions"
ON public.employee_suspensions FOR SELECT TO authenticated
USING (lower(employee_email) = lower(public.current_user_email()));

CREATE INDEX idx_employee_suspensions_email ON public.employee_suspensions (lower(employee_email));
CREATE INDEX idx_employee_suspensions_status ON public.employee_suspensions (status);

CREATE TRIGGER trg_employee_suspensions_updated
BEFORE UPDATE ON public.employee_suspensions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();