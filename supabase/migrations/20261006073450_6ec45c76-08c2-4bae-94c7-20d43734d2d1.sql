ALTER TABLE public.loan_appeals
  ADD COLUMN IF NOT EXISTS guarantor_id uuid,
  ADD COLUMN IF NOT EXISTS guarantor_email text,
  ADD COLUMN IF NOT EXISTS guarantor_name text,
  ADD COLUMN IF NOT EXISTS guarantor_phone text,
  ADD COLUMN IF NOT EXISTS guarantor2_id uuid,
  ADD COLUMN IF NOT EXISTS guarantor2_email text,
  ADD COLUMN IF NOT EXISTS guarantor2_name text,
  ADD COLUMN IF NOT EXISTS guarantor2_phone text;