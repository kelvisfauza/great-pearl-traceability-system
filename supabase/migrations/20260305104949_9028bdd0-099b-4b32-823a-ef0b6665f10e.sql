-- Add overdue tracking fields to loans
ALTER TABLE public.loans 
ADD COLUMN IF NOT EXISTS missed_installments INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS penalty_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_defaulted BOOLEAN DEFAULT false;

-- Add penalty tracking to loan_repayments
ALTER TABLE public.loan_repayments 
ADD COLUMN IF NOT EXISTS penalty_applied NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS overdue_days INTEGER DEFAULT 0;