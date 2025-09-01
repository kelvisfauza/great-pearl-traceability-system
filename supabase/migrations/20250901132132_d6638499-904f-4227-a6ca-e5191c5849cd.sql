-- Create company_employees table for non-system employees
CREATE TABLE public.company_employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  position TEXT NOT NULL,
  department TEXT NOT NULL,
  base_salary NUMERIC NOT NULL DEFAULT 0,
  allowances NUMERIC NOT NULL DEFAULT 0,
  deductions NUMERIC NOT NULL DEFAULT 0,
  hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'Active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.company_employees ENABLE ROW LEVEL SECURITY;

-- Create policies for company_employees
CREATE POLICY "Anyone can view company_employees" 
ON public.company_employees 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert company_employees" 
ON public.company_employees 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update company_employees" 
ON public.company_employees 
FOR UPDATE 
USING (true);

CREATE POLICY "Only admins can delete company_employees" 
ON public.company_employees 
FOR DELETE 
USING (is_current_user_admin());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_company_employees_updated_at
BEFORE UPDATE ON public.company_employees
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create salary_payslips table for monthly payslips
CREATE TABLE public.salary_payslips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.company_employees(id) ON DELETE CASCADE,
  employee_name TEXT NOT NULL,
  employee_id_number TEXT NOT NULL,
  pay_period_month INTEGER NOT NULL,
  pay_period_year INTEGER NOT NULL,
  base_salary NUMERIC NOT NULL DEFAULT 0,
  allowances NUMERIC NOT NULL DEFAULT 0,
  gross_salary NUMERIC NOT NULL DEFAULT 0,
  deductions NUMERIC NOT NULL DEFAULT 0,
  net_salary NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Generated',
  generated_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, pay_period_month, pay_period_year)
);

-- Enable Row Level Security
ALTER TABLE public.salary_payslips ENABLE ROW LEVEL SECURITY;

-- Create policies for salary_payslips
CREATE POLICY "Anyone can view salary_payslips" 
ON public.salary_payslips 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert salary_payslips" 
ON public.salary_payslips 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update salary_payslips" 
ON public.salary_payslips 
FOR UPDATE 
USING (true);

CREATE POLICY "Only admins can delete salary_payslips" 
ON public.salary_payslips 
FOR DELETE 
USING (is_current_user_admin());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_salary_payslips_updated_at
BEFORE UPDATE ON public.salary_payslips
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();