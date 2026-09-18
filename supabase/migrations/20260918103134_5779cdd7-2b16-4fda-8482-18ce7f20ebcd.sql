ALTER TABLE public.quality_assessments
  ADD COLUMN IF NOT EXISTS calculator_price numeric,
  ADD COLUMN IF NOT EXISTS calculator_ref_price numeric,
  ADD COLUMN IF NOT EXISTS calculator_note text,
  ADD COLUMN IF NOT EXISTS calculator_inputs jsonb,
  ADD COLUMN IF NOT EXISTS calculator_captured_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_quality_assessments_calculator_price
  ON public.quality_assessments (calculator_price)
  WHERE calculator_price IS NOT NULL;