ALTER TABLE public.contract_renewal_requests
  ADD COLUMN IF NOT EXISTS requested_salary numeric,
  ADD COLUMN IF NOT EXISTS requested_position text,
  ADD COLUMN IF NOT EXISTS requested_role_changes text,
  ADD COLUMN IF NOT EXISTS requested_other_terms text,
  ADD COLUMN IF NOT EXISTS negotiation_notes text,
  ADD COLUMN IF NOT EXISTS grace_period_until timestamp with time zone,
  ADD COLUMN IF NOT EXISTS hr_response text,
  ADD COLUMN IF NOT EXISTS hr_responded_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS hr_responded_by text;