
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS exclude_from_salary_increment boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS salary_increment_excluded_at timestamptz,
  ADD COLUMN IF NOT EXISTS salary_increment_excluded_reason text;

UPDATE public.employees
SET salary = 300000,
    exclude_from_salary_increment = true,
    salary_increment_excluded_at = now(),
    salary_increment_excluded_reason = 'Salary raised to UGX 300,000 on 2026-07-20 as a one-off adjustment. Excluded from any future scheduled increments.'
WHERE id = '0cc106f6-6004-4c15-aab3-4efe4bc00ca7';

UPDATE public.employees
SET salary = 320000,
    exclude_from_salary_increment = true,
    salary_increment_excluded_at = now(),
    salary_increment_excluded_reason = 'Salary raised to UGX 320,000 on 2026-07-20 as a one-off adjustment. Excluded from any future scheduled increments.'
WHERE id = 'b2fa0987-241a-486e-83ed-564aca47f354';
