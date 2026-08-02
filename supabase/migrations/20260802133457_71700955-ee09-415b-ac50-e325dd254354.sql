-- ============ QUALITY STANDARDS ============
CREATE TABLE IF NOT EXISTS public.v3_quality_standards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coffee_type TEXT NOT NULL UNIQUE,
  max_moisture NUMERIC NOT NULL DEFAULT 13,
  min_outturn NUMERIC NOT NULL DEFAULT 78,
  max_foreign_matter NUMERIC NOT NULL DEFAULT 1,
  max_total_defects NUMERIC NOT NULL DEFAULT 8,
  min_cup_score NUMERIC,
  min_screen_retention NUMERIC,
  grade_a_max_defects NUMERIC NOT NULL DEFAULT 3,
  grade_b_max_defects NUMERIC NOT NULL DEFAULT 6,
  moisture_penalty_per_point NUMERIC NOT NULL DEFAULT 0,
  defect_penalty_per_point NUMERIC NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.v3_quality_standards TO authenticated;
GRANT ALL ON public.v3_quality_standards TO service_role;
ALTER TABLE public.v3_quality_standards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "v3_standards_read" ON public.v3_quality_standards FOR SELECT TO authenticated USING (true);
CREATE POLICY "v3_standards_write" ON public.v3_quality_standards FOR ALL TO authenticated
  USING (public.has_any_v3_role(auth.uid(), ARRAY['quality_manager','v3_admin','managing_director']::public.v3_role[]))
  WITH CHECK (public.has_any_v3_role(auth.uid(), ARRAY['quality_manager','v3_admin','managing_director']::public.v3_role[]));
CREATE TRIGGER trg_v3_standards_updated BEFORE UPDATE ON public.v3_quality_standards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.v3_quality_standards (coffee_type, max_moisture, min_outturn, max_foreign_matter, max_total_defects, min_cup_score, min_screen_retention, grade_a_max_defects, grade_b_max_defects, moisture_penalty_per_point, defect_penalty_per_point)
VALUES
  ('Arabica', 12.5, 80, 0.5, 8, 80, 85, 3, 6, 100, 150),
  ('Robusta', 13.0, 78, 1.0, 10, NULL, 80, 4, 7, 80, 120)
ON CONFLICT (coffee_type) DO NOTHING;

-- ============ ANALYSIS EXTENSIONS ============
ALTER TABLE public.v3_quality_analyses
  ADD COLUMN IF NOT EXISTS sample_weight NUMERIC,
  ADD COLUMN IF NOT EXISTS defect_stones NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS defect_immature NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS screen_retention NUMERIC,
  ADD COLUMN IF NOT EXISTS total_defects NUMERIC,
  ADD COLUMN IF NOT EXISTS grade TEXT,
  ADD COLUMN IF NOT EXISTS passed BOOLEAN,
  ADD COLUMN IF NOT EXISTS failures JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS price_adjustment NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS review_notes TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS retest_of UUID REFERENCES public.v3_quality_analyses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS coffee_type TEXT;

CREATE INDEX IF NOT EXISTS idx_v3_qa_receiving ON public.v3_quality_analyses(receiving_id);
CREATE INDEX IF NOT EXISTS idx_v3_qa_status ON public.v3_quality_analyses(status);

-- ============ AUTO GRADING ============
CREATE OR REPLACE FUNCTION public.v3_apply_quality_grading()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_type TEXT;
  s public.v3_quality_standards%ROWTYPE;
  v_defects NUMERIC;
  v_fail JSONB := '[]'::jsonb;
  v_penalty NUMERIC := 0;
BEGIN
  SELECT COALESCE(NEW.coffee_type, r.coffee_type) INTO v_type
  FROM public.v3_receiving_records r WHERE r.id = NEW.receiving_id;
  NEW.coffee_type := v_type;

  v_defects := COALESCE(NEW.defect_black,0) + COALESCE(NEW.defect_pods,0) + COALESCE(NEW.defect_husks,0)
             + COALESCE(NEW.defect_triage,0) + COALESCE(NEW.defect_broken,0) + COALESCE(NEW.defect_insect,0)
             + COALESCE(NEW.defect_stones,0) + COALESCE(NEW.defect_immature,0);
  NEW.total_defects := v_defects;

  SELECT * INTO s FROM public.v3_quality_standards
   WHERE active AND lower(coffee_type) = lower(COALESCE(v_type,'')) LIMIT 1;
  IF NOT FOUND THEN
    SELECT * INTO s FROM public.v3_quality_standards
     WHERE active AND lower(COALESCE(v_type,'')) LIKE '%' || lower(coffee_type) || '%' LIMIT 1;
  END IF;

  IF s.id IS NULL THEN
    NEW.grade := NULL; NEW.passed := NULL; NEW.failures := '[]'::jsonb;
    RETURN NEW;
  END IF;

  IF NEW.moisture IS NOT NULL AND NEW.moisture > s.max_moisture THEN
    v_fail := v_fail || to_jsonb('Moisture ' || NEW.moisture || '% above limit ' || s.max_moisture || '%');
    v_penalty := v_penalty + (NEW.moisture - s.max_moisture) * s.moisture_penalty_per_point;
  END IF;
  IF NEW.outturn IS NOT NULL AND NEW.outturn < s.min_outturn THEN
    v_fail := v_fail || to_jsonb('Outturn ' || NEW.outturn || '% below minimum ' || s.min_outturn || '%');
  END IF;
  IF NEW.foreign_matter IS NOT NULL AND NEW.foreign_matter > s.max_foreign_matter THEN
    v_fail := v_fail || to_jsonb('Foreign matter ' || NEW.foreign_matter || '% above limit ' || s.max_foreign_matter || '%');
  END IF;
  IF v_defects > s.max_total_defects THEN
    v_fail := v_fail || to_jsonb('Total defects ' || v_defects || ' above limit ' || s.max_total_defects);
  END IF;
  IF v_defects > s.grade_a_max_defects THEN
    v_penalty := v_penalty + (v_defects - s.grade_a_max_defects) * s.defect_penalty_per_point;
  END IF;
  IF s.min_cup_score IS NOT NULL AND NEW.cup_score IS NOT NULL AND NEW.cup_score < s.min_cup_score THEN
    v_fail := v_fail || to_jsonb('Cup score ' || NEW.cup_score || ' below minimum ' || s.min_cup_score);
  END IF;
  IF s.min_screen_retention IS NOT NULL AND NEW.screen_retention IS NOT NULL AND NEW.screen_retention < s.min_screen_retention THEN
    v_fail := v_fail || to_jsonb('Screen retention ' || NEW.screen_retention || '% below minimum ' || s.min_screen_retention || '%');
  END IF;

  NEW.failures := v_fail;
  NEW.passed := (jsonb_array_length(v_fail) = 0);
  NEW.grade := CASE
    WHEN jsonb_array_length(v_fail) > 0 THEN 'Off-grade'
    WHEN v_defects <= s.grade_a_max_defects THEN 'Grade A'
    WHEN v_defects <= s.grade_b_max_defects THEN 'Grade B'
    ELSE 'Grade C' END;
  IF NEW.price_adjustment IS NULL OR TG_OP = 'INSERT' OR NEW.price_adjustment = 0 THEN
    NEW.price_adjustment := -ROUND(v_penalty);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_v3_quality_grade ON public.v3_quality_analyses;
CREATE TRIGGER trg_v3_quality_grade BEFORE INSERT OR UPDATE ON public.v3_quality_analyses
  FOR EACH ROW EXECUTE FUNCTION public.v3_apply_quality_grading();

-- ============ SUBMIT ============
CREATE OR REPLACE FUNCTION public.v3_submit_quality_analysis(p_analysis_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a public.v3_quality_analyses%ROWTYPE;
BEGIN
  IF NOT public.has_any_v3_role(auth.uid(), ARRAY['quality_officer','quality_manager','v3_admin']::public.v3_role[]) THEN
    RAISE EXCEPTION 'Not authorised to submit quality results';
  END IF;
  SELECT * INTO a FROM public.v3_quality_analyses WHERE id = p_analysis_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Analysis not found'; END IF;
  IF a.submitted THEN RAISE EXCEPTION 'This worksheet is already submitted'; END IF;
  IF a.moisture IS NULL OR a.outturn IS NULL OR a.foreign_matter IS NULL THEN
    RAISE EXCEPTION 'Moisture, outturn and foreign matter are required before submission';
  END IF;

  UPDATE public.v3_quality_analyses
     SET submitted = true, submitted_at = now(), status = 'submitted',
         analysed_by = COALESCE(analysed_by, auth.uid())
   WHERE id = p_analysis_id RETURNING * INTO a;

  UPDATE public.v3_receiving_records SET status = 'quality_submitted' WHERE id = a.receiving_id;

  INSERT INTO public.v3_audit_log (actor_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), 'quality_submitted', 'v3_quality_analyses', a.id,
          jsonb_build_object('sample_code', a.sample_code, 'grade', a.grade, 'passed', a.passed));

  RETURN jsonb_build_object('ok', true, 'grade', a.grade, 'passed', a.passed, 'failures', a.failures, 'price_adjustment', a.price_adjustment);
END;
$$;

-- ============ MANAGER REVIEW ============
CREATE OR REPLACE FUNCTION public.v3_review_quality_analysis(
  p_analysis_id UUID, p_action TEXT, p_notes TEXT DEFAULT NULL, p_price_adjustment NUMERIC DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a public.v3_quality_analyses%ROWTYPE; v_new UUID;
BEGIN
  IF NOT public.has_any_v3_role(auth.uid(), ARRAY['quality_manager','v3_admin']::public.v3_role[]) THEN
    RAISE EXCEPTION 'Only the Quality Manager can review analyses';
  END IF;
  IF p_action NOT IN ('approve','reject','retest') THEN RAISE EXCEPTION 'Invalid action'; END IF;

  SELECT * INTO a FROM public.v3_quality_analyses WHERE id = p_analysis_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Analysis not found'; END IF;
  IF NOT a.submitted THEN RAISE EXCEPTION 'Results have not been submitted yet'; END IF;

  IF p_action = 'approve' THEN
    UPDATE public.v3_quality_analyses
       SET status = 'approved', approved_by = auth.uid(), approved_at = now(),
           reviewed_by = auth.uid(), reviewed_at = now(), review_notes = p_notes,
           price_adjustment = COALESCE(p_price_adjustment, price_adjustment)
     WHERE id = p_analysis_id RETURNING * INTO a;
    UPDATE public.v3_receiving_records
       SET status = 'awaiting_approval',
           price_adjustments = COALESCE(a.price_adjustment, 0),
           final_price = COALESCE(reference_price, 0) + COALESCE(a.price_adjustment, 0)
     WHERE id = a.receiving_id;

  ELSIF p_action = 'reject' THEN
    UPDATE public.v3_quality_analyses
       SET status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(), review_notes = p_notes
     WHERE id = p_analysis_id RETURNING * INTO a;
    UPDATE public.v3_receiving_records
       SET status = 'rejected', rejection_reason = COALESCE(p_notes, 'Rejected on quality')
     WHERE id = a.receiving_id;

  ELSE
    UPDATE public.v3_quality_analyses
       SET status = 'retested', retest_requested = true, retest_reason = p_notes,
           reviewed_by = auth.uid(), reviewed_at = now()
     WHERE id = p_analysis_id RETURNING * INTO a;
    INSERT INTO public.v3_quality_analyses (receiving_id, sample_code, stage, retest_of, status, analysed_by)
    VALUES (a.receiving_id, a.sample_code, 'retest', a.id, 'draft', NULL)
    RETURNING id INTO v_new;
    UPDATE public.v3_receiving_records SET status = 'awaiting_quality' WHERE id = a.receiving_id;
  END IF;

  INSERT INTO public.v3_audit_log (actor_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), 'quality_' || p_action, 'v3_quality_analyses', a.id,
          jsonb_build_object('sample_code', a.sample_code, 'notes', p_notes));

  RETURN jsonb_build_object('ok', true, 'action', p_action, 'retest_analysis_id', v_new);
END;
$$;

REVOKE ALL ON FUNCTION public.v3_submit_quality_analysis(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.v3_review_quality_analysis(UUID, TEXT, TEXT, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.v3_submit_quality_analysis(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.v3_review_quality_analysis(UUID, TEXT, TEXT, NUMERIC) TO authenticated;