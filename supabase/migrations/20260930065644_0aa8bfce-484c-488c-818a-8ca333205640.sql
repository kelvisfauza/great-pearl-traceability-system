ALTER TABLE public.provider_submission_requests
  ADD COLUMN IF NOT EXISTS admin_approved_amount numeric,
  ADD COLUMN IF NOT EXISTS admin_approved_charge numeric,
  ADD COLUMN IF NOT EXISTS admin_approved_by_name text,
  ADD COLUMN IF NOT EXISTS finance_released_by_name text;