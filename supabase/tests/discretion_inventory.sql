-- Run against Supabase as an administrator. All test changes are rolled back.
BEGIN;
DO $test$
DECLARE
  v_assessment uuid;
  v_before numeric;
  v_finance jsonb;
  v_quality jsonb;
  v_sales jsonb;
  v_after numeric;
  v_expected_delta numeric;
  v_bad_price_rejected boolean := false;
BEGIN
  SELECT id INTO STRICT v_assessment FROM public.quality_assessments
  WHERE store_record_id='20260907016' AND admin_discretion_buy;
  SELECT to_jsonb(f) INTO STRICT v_finance FROM public.finance_coffee_lots f WHERE quality_assessment_id=v_assessment;
  SELECT jsonb_build_object('status',status,'reject_final',reject_final) INTO v_quality
  FROM public.quality_assessments WHERE id=v_assessment;
  SELECT jsonb_agg(to_jsonb(s) ORDER BY s.id) INTO v_sales FROM public.inventory_batch_sales s;
  v_expected_delta := CASE WHEN EXISTS(SELECT 1 FROM public.inventory_batch_sources WHERE coffee_record_id='20260907016') THEN 0 ELSE 12 END;
  SELECT sum(total_kilograms) INTO v_before FROM public.inventory_batches;
  UPDATE public.quality_assessments SET admin_discretion_buy=true WHERE id=v_assessment;
  IF (SELECT sum(total_kilograms) FROM public.inventory_batches) IS DISTINCT FROM v_before+v_expected_delta THEN
    RAISE EXCEPTION 'The 12 kg delivery must add exactly 12 kg only if not already linked';
  END IF;
  IF (SELECT sum(kilograms) FROM public.inventory_batch_sources WHERE coffee_record_id='20260907016') IS DISTINCT FROM 12::numeric THEN
    RAISE EXCEPTION 'The saved delivery must have exactly 12 kg of linked stock';
  END IF;
  SELECT sum(total_kilograms) INTO v_after FROM public.inventory_batches;
  UPDATE public.quality_assessments SET admin_discretion_buy=true WHERE id=v_assessment;
  PERFORM public.ensure_inventory_batch_source_for_record('20260907016');
  IF (SELECT sum(total_kilograms) FROM public.inventory_batches) IS DISTINCT FROM v_after
     OR (SELECT count(*) FROM public.inventory_batch_sources WHERE coffee_record_id='20260907016')<>1 THEN
    RAISE EXCEPTION 'Repeated approval or stock promotion must not add duplicate stock';
  END IF;
  IF (SELECT jsonb_build_object('status',status,'reject_final',reject_final) FROM public.quality_assessments WHERE id=v_assessment) IS DISTINCT FROM v_quality THEN
    RAISE EXCEPTION 'Commercial discretion approval must preserve the quality rejection';
  END IF;
  IF (SELECT to_jsonb(f) FROM public.finance_coffee_lots f WHERE quality_assessment_id=v_assessment) IS DISTINCT FROM v_finance THEN
    RAISE EXCEPTION 'Stock promotion must not change the saved Finance price or payment status';
  END IF;
  IF (SELECT jsonb_agg(to_jsonb(s) ORDER BY s.id) FROM public.inventory_batch_sales s) IS DISTINCT FROM v_sales THEN
    RAISE EXCEPTION 'Stock promotion must preserve all recorded sale allocations';
  END IF;
  BEGIN
    UPDATE public.quality_assessments SET admin_discretion_price=0,final_price=0,suggested_price=0 WHERE id=v_assessment;
  EXCEPTION WHEN raise_exception THEN
    v_bad_price_rejected:=true;
  END;
  IF NOT v_bad_price_rejected THEN RAISE EXCEPTION 'A discretion purchase with no positive price must fail'; END IF;
  RAISE NOTICE 'PASS: 12 kg promotion, retry idempotency, rejected quality, unchanged Finance/sales, invalid-price rollback';
END;
$test$;
ROLLBACK;