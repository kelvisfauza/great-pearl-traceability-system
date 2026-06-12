ALTER TABLE public.loans
  ADD COLUMN IF NOT EXISTS appeal_id uuid REFERENCES public.loan_appeals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS appeal_admin_voters jsonb,
  ADD COLUMN IF NOT EXISTS approved_via_appeal boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_loans_appeal_id ON public.loans(appeal_id);