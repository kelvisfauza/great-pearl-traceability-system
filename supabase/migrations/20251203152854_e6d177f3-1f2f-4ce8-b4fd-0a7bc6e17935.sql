-- Create employee daily reports table
CREATE TABLE public.employee_daily_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL,
  employee_name TEXT NOT NULL,
  employee_email TEXT NOT NULL,
  department TEXT NOT NULL,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  report_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'submitted',
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, report_date)
);

-- Enable RLS
ALTER TABLE public.employee_daily_reports ENABLE ROW LEVEL SECURITY;

-- Users can view their own reports
CREATE POLICY "Users can view own daily reports"
ON public.employee_daily_reports
FOR SELECT
USING (
  employee_email = (SELECT email FROM employees WHERE auth_user_id = auth.uid())
  OR user_has_permission('Human Resources')
  OR is_current_user_admin()
);

-- Users can insert their own reports
CREATE POLICY "Users can insert own daily reports"
ON public.employee_daily_reports
FOR INSERT
WITH CHECK (
  employee_email = (SELECT email FROM employees WHERE auth_user_id = auth.uid())
);

-- Users can update their own reports
CREATE POLICY "Users can update own daily reports"
ON public.employee_daily_reports
FOR UPDATE
USING (
  employee_email = (SELECT email FROM employees WHERE auth_user_id = auth.uid())
  AND report_date = CURRENT_DATE
);

-- Only admins can delete
CREATE POLICY "Only admins can delete daily reports"
ON public.employee_daily_reports
FOR DELETE
USING (is_current_user_admin());

-- Create index for faster lookups
CREATE INDEX idx_employee_daily_reports_employee ON public.employee_daily_reports(employee_id, report_date);
CREATE INDEX idx_employee_daily_reports_date ON public.employee_daily_reports(report_date);
CREATE INDEX idx_employee_daily_reports_department ON public.employee_daily_reports(department);

-- Create trigger for updated_at
CREATE TRIGGER update_employee_daily_reports_updated_at
BEFORE UPDATE ON public.employee_daily_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();