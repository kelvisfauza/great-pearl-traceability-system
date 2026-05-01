DELETE FROM public.monthly_allowance_log a
USING public.monthly_allowance_log b
WHERE a.ctid < b.ctid
  AND a.employee_email = b.employee_email
  AND a.allowance_type = b.allowance_type
  AND a.month_year = b.month_year;