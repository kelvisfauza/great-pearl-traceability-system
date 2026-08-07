ALTER TABLE public.approval_requests
  ADD COLUMN IF NOT EXISTS payout_status text,
  ADD COLUMN IF NOT EXISTS payout_provider text,
  ADD COLUMN IF NOT EXISTS payout_ref text,
  ADD COLUMN IF NOT EXISTS payout_error text,
  ADD COLUMN IF NOT EXISTS payout_phone text,
  ADD COLUMN IF NOT EXISTS payout_attempted_at timestamptz,
  ADD COLUMN IF NOT EXISTS payout_completed_at timestamptz;