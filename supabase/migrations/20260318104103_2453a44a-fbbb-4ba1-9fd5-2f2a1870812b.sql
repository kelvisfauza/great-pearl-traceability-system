ALTER TABLE public.loans 
  ADD COLUMN IF NOT EXISTS is_topup boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS parent_loan_id uuid REFERENCES public.loans(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.loans.is_topup IS 'Whether this loan was created as a top-up of an existing loan';
COMMENT ON COLUMN public.loans.parent_loan_id IS 'Reference to the original loan that was topped up';