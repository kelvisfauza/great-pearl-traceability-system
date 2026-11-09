-- Run with an administrative connection; no test changes are retained.
BEGIN;
DO $test$
DECLARE
  r public.coffee_records%ROWTYPE;
  b public.inventory_batches%ROWTYPE;
  v_before numeric;
  v_remaining numeric;
  v_sales jsonb;
  v_finance jsonb;
BEGIN
  SELECT * INTO STRICT r FROM public.coffee_records WHERE id='CR-1777393917809';
  IF r.status<>'assessed' OR r.kilograms<>237 OR EXISTS(SELECT 1 FROM public.inventory_batch_sources WHERE coffee_record_id=r.id) THEN
    RAISE EXCEPTION 'Expected the saved 237 kg assessed, unlinked delivery fixture';
  END IF;
  SELECT sum(total_kilograms),sum(remaining_kilograms) INTO v_before,v_remaining FROM public.inventory_batches;
  SELECT jsonb_agg(to_jsonb(s) ORDER BY s.id) INTO v_sales FROM public.inventory_batch_sales s;
  SELECT jsonb_agg(to_jsonb(f) ORDER BY f.id) INTO v_finance FROM public.finance_coffee_lots f WHERE coffee_record_id=r.id;
  UPDATE public.coffee_records SET status='inventory' WHERE id=r.id;
  SELECT ib.* INTO STRICT b FROM public.inventory_batches ib JOIN public.inventory_batch_sources s ON s.batch_id=ib.id WHERE s.coffee_record_id=r.id;
  IF b.batch_date<>r.date OR lower(b.coffee_type)<>lower(r.coffee_type) THEN
    RAISE EXCEPTION 'Automatic batches must group by delivery date and coffee type';
  END IF;
  IF (SELECT sum(total_kilograms) FROM public.inventory_batches) IS DISTINCT FROM v_before+237
    OR (SELECT sum(remaining_kilograms) FROM public.inventory_batches) IS DISTINCT FROM v_remaining+237 THEN
    RAISE EXCEPTION 'Inventory promotion must automatically add exactly 237 kg';
  END IF;
  PERFORM public.ensure_inventory_batch_source_for_record(r.id);
  PERFORM public.ensure_inventory_batch_source_for_record(r.id);
  IF (SELECT count(*) FROM public.inventory_batch_sources WHERE coffee_record_id=r.id)<>1
    OR (SELECT sum(total_kilograms) FROM public.inventory_batches) IS DISTINCT FROM v_before+237 THEN
    RAISE EXCEPTION 'Repeated automatic linkage must not duplicate stock';
  END IF;
  IF (SELECT jsonb_agg(to_jsonb(s) ORDER BY s.id) FROM public.inventory_batch_sales s) IS DISTINCT FROM v_sales
    OR (SELECT jsonb_agg(to_jsonb(f) ORDER BY f.id) FROM public.finance_coffee_lots f WHERE coffee_record_id=r.id) IS DISTINCT FROM v_finance THEN
    RAISE EXCEPTION 'Automatic batching must not change sales or supplier payments';
  END IF;
  RAISE NOTICE 'PASS: automatic 237 kg linkage, daily grouping, retries, unchanged sales/payments';
END;
$test$;
ROLLBACK;