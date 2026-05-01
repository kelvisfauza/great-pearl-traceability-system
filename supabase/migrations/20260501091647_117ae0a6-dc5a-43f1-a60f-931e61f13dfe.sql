ALTER TABLE public.monthly_allowance_log
ADD CONSTRAINT monthly_allowance_log_unique_per_month
UNIQUE (employee_email, allowance_type, month_year);