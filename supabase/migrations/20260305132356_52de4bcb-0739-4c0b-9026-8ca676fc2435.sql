
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS wallet_frozen boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS wallet_frozen_at timestamptz,
ADD COLUMN IF NOT EXISTS wallet_frozen_by text,
ADD COLUMN IF NOT EXISTS wallet_frozen_reason text;
