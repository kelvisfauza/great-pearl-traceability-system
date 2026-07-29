CREATE TABLE IF NOT EXISTS public.quality_form_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_number text NOT NULL UNIQUE,
  period_key text NOT NULL,
  seq integer NOT NULL,
  issued_by uuid,
  issued_by_name text,
  used_by_assessment_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.quality_form_numbers TO authenticated;
GRANT ALL ON public.quality_form_numbers TO service_role;

ALTER TABLE public.quality_form_numbers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view form numbers" ON public.quality_form_numbers;
CREATE POLICY "Authenticated can view form numbers" ON public.quality_form_numbers FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can issue form numbers" ON public.quality_form_numbers;
CREATE POLICY "Authenticated can issue form numbers" ON public.quality_form_numbers FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can update form numbers" ON public.quality_form_numbers;
CREATE POLICY "Authenticated can update form numbers" ON public.quality_form_numbers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_quality_form_numbers_period ON public.quality_form_numbers(period_key, seq);

ALTER TABLE public.quality_assessments ADD COLUMN IF NOT EXISTS form_number text;
CREATE INDEX IF NOT EXISTS idx_quality_assessments_form_number ON public.quality_assessments(form_number);

CREATE OR REPLACE FUNCTION public.issue_quality_form_numbers(p_count integer DEFAULT 1, p_issued_by_name text DEFAULT NULL)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period text := to_char(now() AT TIME ZONE 'Africa/Kampala', 'YYYYMM');
  v_next integer;
  v_out text[] := ARRAY[]::text[];
  v_num text;
  i integer;
BEGIN
  IF p_count IS NULL OR p_count < 1 THEN p_count := 1; END IF;
  IF p_count > 100 THEN p_count := 100; END IF;

  PERFORM pg_advisory_xact_lock(hashtext('quality_form_numbers_' || v_period));

  SELECT COALESCE(MAX(seq), 0) + 1 INTO v_next
  FROM public.quality_form_numbers WHERE period_key = v_period;

  FOR i IN 0..(p_count - 1) LOOP
    v_num := 'GAC QA ' || lpad((v_next + i)::text, 4, '0');
    INSERT INTO public.quality_form_numbers (form_number, period_key, seq, issued_by, issued_by_name)
    VALUES (v_num, v_period, v_next + i, auth.uid(), p_issued_by_name);
    v_out := array_append(v_out, v_num);
  END LOOP;

  RETURN v_out;
END;
$$;

GRANT EXECUTE ON FUNCTION public.issue_quality_form_numbers(integer, text) TO authenticated, service_role;