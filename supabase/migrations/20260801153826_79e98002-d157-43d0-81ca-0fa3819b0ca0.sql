ALTER TABLE public.quality_assessments
  ADD COLUMN IF NOT EXISTS qm_reviewed_by text,
  ADD COLUMN IF NOT EXISTS qm_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS qm_action text,
  ADD COLUMN IF NOT EXISTS qm_notes text,
  ADD COLUMN IF NOT EXISTS qm_original_price numeric;

CREATE TABLE IF NOT EXISTS public.quality_manager_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid,
  batch_number text,
  action text NOT NULL,
  reviewer_email text,
  reviewer_name text,
  original_price numeric,
  approved_price numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.quality_manager_approvals TO authenticated;
GRANT ALL ON public.quality_manager_approvals TO service_role;

ALTER TABLE public.quality_manager_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view quality manager approvals"
ON public.quality_manager_approvals FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can log quality manager approvals"
ON public.quality_manager_approvals FOR INSERT TO authenticated WITH CHECK (true);

CREATE TRIGGER update_quality_manager_approvals_updated_at
BEFORE UPDATE ON public.quality_manager_approvals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();