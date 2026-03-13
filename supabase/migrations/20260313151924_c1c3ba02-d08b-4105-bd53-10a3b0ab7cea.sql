
ALTER TABLE public.loans 
  ADD COLUMN IF NOT EXISTS counter_offer_amount numeric NULL,
  ADD COLUMN IF NOT EXISTS counter_offer_by text NULL,
  ADD COLUMN IF NOT EXISTS counter_offer_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS counter_offer_comments text NULL,
  ADD COLUMN IF NOT EXISTS original_loan_amount numeric NULL;
