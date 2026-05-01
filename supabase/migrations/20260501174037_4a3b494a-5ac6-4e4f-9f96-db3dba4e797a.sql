
ALTER TABLE public.quality_assessments
  ADD COLUMN IF NOT EXISTS physical_assessment_by text,
  ADD COLUMN IF NOT EXISTS system_assessment_by text,
  ADD COLUMN IF NOT EXISTS assessment_ref text UNIQUE;

CREATE OR REPLACE FUNCTION public.generate_quality_assessment_ref()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  yymm text;
  seq_num int;
  new_ref text;
BEGIN
  IF NEW.assessment_ref IS NULL OR NEW.assessment_ref = '' THEN
    yymm := to_char(now(), 'YYMM');
    SELECT COALESCE(MAX(CAST(substring(assessment_ref FROM 'QA-' || yymm || '-(\d+)$') AS INT)), 0) + 1
      INTO seq_num
    FROM public.quality_assessments
    WHERE assessment_ref LIKE 'QA-' || yymm || '-%';
    new_ref := 'QA-' || yymm || '-' || lpad(seq_num::text, 4, '0');
    NEW.assessment_ref := new_ref;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_quality_assessment_ref ON public.quality_assessments;
CREATE TRIGGER trg_generate_quality_assessment_ref
  BEFORE INSERT ON public.quality_assessments
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_quality_assessment_ref();
