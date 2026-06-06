ALTER TABLE public.overdraft_eligibility
  ADD COLUMN IF NOT EXISTS notified_at timestamptz,
  ADD COLUMN IF NOT EXISTS notified_limit numeric;