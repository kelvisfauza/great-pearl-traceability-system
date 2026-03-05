
-- Add repayment_frequency to loans table (default 'monthly' for existing loans)
ALTER TABLE public.loans 
  ADD COLUMN IF NOT EXISTS repayment_frequency TEXT NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS daily_interest_rate NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_weeks INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS weekly_installment NUMERIC DEFAULT NULL;

-- Update existing loans to explicitly be monthly
UPDATE public.loans SET repayment_frequency = 'monthly' WHERE repayment_frequency IS NULL;
