ALTER TABLE public.loans DROP CONSTRAINT IF EXISTS loans_duration_months_check;
ALTER TABLE public.loans ADD CONSTRAINT loans_duration_months_check CHECK (duration_months >= 1 AND duration_months <= 8);

ALTER TABLE public.loans
  ADD COLUMN IF NOT EXISTS guarantor2_id uuid,
  ADD COLUMN IF NOT EXISTS guarantor2_name text,
  ADD COLUMN IF NOT EXISTS guarantor2_email text,
  ADD COLUMN IF NOT EXISTS guarantor2_phone text,
  ADD COLUMN IF NOT EXISTS guarantor2_approval_code text,
  ADD COLUMN IF NOT EXISTS guarantor2_approved boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS guarantor2_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS guarantor2_declined boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_loans_guarantor2_email ON public.loans(guarantor2_email);