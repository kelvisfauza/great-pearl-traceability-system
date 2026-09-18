ALTER TABLE public.loans
  ADD COLUMN IF NOT EXISTS revision_amount numeric,
  ADD COLUMN IF NOT EXISTS revision_duration_months integer,
  ADD COLUMN IF NOT EXISTS revision_frequency text,
  ADD COLUMN IF NOT EXISTS revision_total_repayable numeric,
  ADD COLUMN IF NOT EXISTS revision_installment numeric,
  ADD COLUMN IF NOT EXISTS revision_note text,
  ADD COLUMN IF NOT EXISTS revision_by text,
  ADD COLUMN IF NOT EXISTS revision_at timestamptz,
  ADD COLUMN IF NOT EXISTS revision_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS revision_signature text,
  ADD COLUMN IF NOT EXISTS revision_terms_version text,
  ADD COLUMN IF NOT EXISTS revision_declined_reason text;