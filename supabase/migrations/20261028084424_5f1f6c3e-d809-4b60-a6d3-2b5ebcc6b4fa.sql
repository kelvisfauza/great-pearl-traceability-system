CREATE OR REPLACE FUNCTION public.revoke_grn_prints(p_lot_ids uuid[], p_reason text)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_lot public.finance_coffee_lots%ROWTYPE;
  v_row public.grn_print_log%ROWTYPE;
  v_count integer := 0;
BEGIN
  IF auth.uid() IS NULL OR NOT public.can_process_finance() THEN
    RAISE EXCEPTION 'Not authorized to revoke GRN prints' USING ERRCODE = '42501';
  END IF;
  IF coalesce(cardinality(p_lot_ids),0) < 1 OR cardinality(p_lot_ids) > 50 THEN
    RAISE EXCEPTION 'Select between 1 and 50 GRNs';
  END IF;
  IF nullif(btrim(p_reason),'') IS NULL THEN
    RAISE EXCEPTION 'Enter why these prints are being revoked';
  END IF;
  FOR v_lot IN SELECT * FROM public.finance_coffee_lots WHERE id = ANY(p_lot_ids) ORDER BY id FOR UPDATE LOOP
    IF lower(v_lot.finance_status::text) <> 'ready_for_finance' THEN
      RAISE EXCEPTION 'Only GRNs awaiting payment can have prints revoked';
    END IF;
    FOR v_row IN
      SELECT * FROM public.grn_print_log
      WHERE lot_id = v_lot.id OR
        (nullif(v_lot.batch_number,'') IS NOT NULL AND upper(batch_number) = upper(v_lot.batch_number))
      ORDER BY id FOR UPDATE
    LOOP
      INSERT INTO public.audit_logs(action,table_name,record_id,record_data,reason,performed_by,department)
      VALUES ('grn_print_revoked','grn_print_log',v_row.id::text,
        jsonb_build_object('print',to_jsonb(v_row),'finance_lot_id',v_lot.id,'revoked_by_user_id',auth.uid()),
        btrim(p_reason),coalesce(public.current_user_email(),auth.uid()::text),'Finance');
      DELETE FROM public.grn_print_log WHERE id = v_row.id;
      v_count := v_count + 1;
    END LOOP;
  END LOOP;
  IF (SELECT count(DISTINCT id) FROM public.finance_coffee_lots WHERE id = ANY(p_lot_ids)) <> (SELECT count(DISTINCT x) FROM unnest(p_lot_ids) x) THEN
    RAISE EXCEPTION 'A selected GRN no longer exists';
  END IF;
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.revoke_grn_prints(uuid[],text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_grn_prints(uuid[],text) TO authenticated, service_role;