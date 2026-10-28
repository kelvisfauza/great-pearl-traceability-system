DO $$
DECLARE v_row public.grn_print_log%ROWTYPE; v_cutoff timestamptz;
BEGIN
  SELECT created_at INTO v_cutoff FROM public.finance_coffee_lots WHERE id='48b3868c-2dac-4cac-b305-3ac14319f647' AND batch_number='20261002004' AND lower(finance_status::text)='ready_for_finance';
  IF v_cutoff IS NULL THEN RAISE EXCEPTION 'Starting ready-for-payment batch not found'; END IF;
  PERFORM id FROM public.finance_coffee_lots WHERE lower(finance_status::text)='ready_for_finance' AND created_at <= v_cutoff ORDER BY id FOR UPDATE;
  FOR v_row IN
    SELECT g.* FROM public.grn_print_log g
    WHERE g.last_printed_at < '2026-10-27 21:00:00+00'
    AND EXISTS (SELECT 1 FROM public.finance_coffee_lots l WHERE lower(l.finance_status::text)='ready_for_finance' AND l.created_at <= v_cutoff AND (g.lot_id=l.id OR upper(g.batch_number)=upper(l.batch_number)))
    ORDER BY g.id FOR UPDATE
  LOOP
    INSERT INTO public.audit_logs(action,table_name,record_id,record_data,reason,performed_by,department)
    VALUES ('grn_print_revoked','grn_print_log',v_row.id::text,jsonb_build_object('print',to_jsonb(v_row),'starting_batch','20261002004','list_cutoff_created_at',v_cutoff,'protected_prints_from','2026-10-27 21:00:00+00'),
      'Fauza Kelvis requested reset of misplaced GRN papers from batch 20261002004 downward; today prints excluded','Fauza Kelvis (explicit chat request, 2026-10-28)','Finance');
    DELETE FROM public.grn_print_log WHERE id=v_row.id;
  END LOOP;
END $$;