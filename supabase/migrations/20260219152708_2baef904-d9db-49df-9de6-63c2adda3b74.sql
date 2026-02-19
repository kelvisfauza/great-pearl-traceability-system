
-- Add deduction tracking columns to employee_salary_payments
ALTER TABLE public.employee_salary_payments
  ADD COLUMN IF NOT EXISTS gross_salary NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS advance_deduction NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS advance_id UUID,
  ADD COLUMN IF NOT EXISTS time_deduction NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS time_deduction_hours NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_salary NUMERIC NOT NULL DEFAULT 0;
