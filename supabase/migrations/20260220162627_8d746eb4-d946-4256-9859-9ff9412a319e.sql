
-- Add column to track when time deductions have been applied to a salary payment
ALTER TABLE public.time_deductions ADD COLUMN IF NOT EXISTS deducted_in_payment_id text DEFAULT NULL;

-- Add column to employee_salary_payments to clearly label payment type
ALTER TABLE public.employee_salary_payments ADD COLUMN IF NOT EXISTS payment_label text DEFAULT NULL;
