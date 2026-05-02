ALTER TABLE public.quality_assessments
  ADD COLUMN IF NOT EXISTS permanently_rejected boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS permanently_rejected_by text,
  ADD COLUMN IF NOT EXISTS permanently_rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS permanently_rejected_notes text;

CREATE INDEX IF NOT EXISTS idx_quality_assessments_permanently_rejected
  ON public.quality_assessments(permanently_rejected)
  WHERE permanently_rejected = true;