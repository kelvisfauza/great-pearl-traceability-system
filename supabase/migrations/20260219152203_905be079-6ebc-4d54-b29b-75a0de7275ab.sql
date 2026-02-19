
-- Create individual employee salary payment records for HR payroll processing
CREATE TABLE public.employee_salary_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  employee_email TEXT NOT NULL,
  employee_phone TEXT,
  salary_amount NUMERIC NOT NULL DEFAULT 0,
  payment_month TEXT NOT NULL, -- e.g. 'February 2026'
  payment_method TEXT NOT NULL DEFAULT 'Bank Transfer',
  transaction_id TEXT,
  status TEXT NOT NULL DEFAULT 'processing', -- 'processing', 'completed'
  processed_by TEXT NOT NULL,
  processed_by_email TEXT NOT NULL,
  completed_at TIMESTAMPTZ,
  completed_by TEXT,
  sms_sent BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.employee_salary_payments ENABLE ROW LEVEL SECURITY;

-- HR and Admin can do everything
CREATE POLICY "HR and Admin full access on salary payments" ON public.employee_salary_payments
FOR ALL USING (
  user_has_permission('Human Resources')
  OR is_current_user_admin()
);

-- Employees can view their own payment records
CREATE POLICY "Employees view own salary payments" ON public.employee_salary_payments
FOR SELECT USING (
  employee_email = get_current_user_email()
);

-- Auto-update updated_at
CREATE TRIGGER update_employee_salary_payments_updated_at
  BEFORE UPDATE ON public.employee_salary_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
