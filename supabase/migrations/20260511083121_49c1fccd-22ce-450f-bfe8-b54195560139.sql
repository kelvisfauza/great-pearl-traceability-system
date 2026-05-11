
ALTER TABLE public.monthly_overtime_reviews
  ADD COLUMN IF NOT EXISTS payout_method text,
  ADD COLUMN IF NOT EXISTS payout_destination text,
  ADD COLUMN IF NOT EXISTS payout_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS payout_reference text;

-- Recompute April 2026 at 1,500 UGX/hr capped at 100,000
UPDATE public.monthly_overtime_reviews
SET overtime_rate_per_hour = 1500,
    calculated_pay = LEAST(CEIL(GREATEST(net_overtime_minutes,0)/60.0) * 1500, 100000),
    adjusted_pay = NULL,
    adjusted_overtime_minutes = NULL,
    status = 'pending',
    payout_method = NULL,
    payout_destination = NULL,
    payout_status = 'pending',
    paid_at = NULL,
    payout_reference = NULL,
    reviewed_by = NULL,
    reviewed_at = NULL,
    admin_notes = NULL,
    updated_at = now()
WHERE month = 4 AND year = 2026;
