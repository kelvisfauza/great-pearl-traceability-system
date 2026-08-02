CREATE OR REPLACE FUNCTION public.v3_submit_quality_analysis(p_analysis_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  INSERT INTO public.v3_audit_log (actor_id, action, entity_type, entity_id, after_data)
  VALUES (auth.uid(), 'quality_submitted', 'v3_quality_analyses', a.id,
          jsonb_build_object('sample_code', a.sample_code, 'grade', a.grade, 'passed', a.passed));

  RETURN jsonb_build_object('ok', true, 'grade', a.grade, 'passed', a.passed, 'failures', a.failures, 'price_adjustment', a.price_adjustment);
END;
$function$;

CREATE OR REPLACE FUNCTION public.v3_review_quality_analysis(p_analysis_id uuid, p_action text, p_notes text DEFAULT NULL::text, p_price_adjustment numeric DEFAULT NULL::numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  INSERT INTO public.v3_audit_log (actor_id, action, entity_type, entity_id, after_data)
  VALUES (auth.uid(), 'quality_' || p_action, 'v3_quality_analyses', a.id,
          jsonb_build_object('sample_code', a.sample_code, 'notes', p_notes));

  RETURN jsonb_build_object('ok', true, 'action', p_action, 'retest_analysis_id', v_new);
END;
$function$;