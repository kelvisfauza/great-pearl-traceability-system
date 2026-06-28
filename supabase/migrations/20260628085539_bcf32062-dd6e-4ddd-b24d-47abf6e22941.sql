ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS wallet_locked_amount NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wallet_locked_reason TEXT,
  ADD COLUMN IF NOT EXISTS wallet_locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS wallet_locked_percentage NUMERIC;