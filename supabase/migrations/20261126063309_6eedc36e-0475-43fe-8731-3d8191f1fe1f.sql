ALTER TABLE public.provider_submission_requests
  ADD COLUMN IF NOT EXISTS auto_approval_day date,
  ADD COLUMN IF NOT EXISTS auto_approval_note text;
CREATE UNIQUE INDEX IF NOT EXISTS provider_submission_one_auto_approval_per_day
  ON public.provider_submission_requests (auto_approval_day)
  WHERE auto_approval_day IS NOT NULL;