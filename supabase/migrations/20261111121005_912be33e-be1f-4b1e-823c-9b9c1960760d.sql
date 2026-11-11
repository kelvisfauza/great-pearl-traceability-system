CREATE OR REPLACE FUNCTION public.delete_duplicate_coffee_record(p_record_id text, p_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r coffee_records; v_paid numeric := 0; v_sup uuid; v_adv uuid; s record; v_actor text := public.current_user_email();
BEGIN
  IF NOT (public.can_manage_system_red_flags() OR public.can_manage_users()) THEN
    RAISE EXCEPTION 'Only administrators can delete double entries';
  END IF;
  SELECT * INTO r FROM coffee_records WHERE id = p_record_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Delivery not found'; END IF;

  SELECT coalesce(sum(sp.amount_paid_ugx),0), max(coalesce(sp.supplier_id, l.supplier_id)::text)::uuid
    INTO v_paid, v_sup
  FROM supplier_payments sp JOIN finance_coffee_lots l ON l.id = sp.lot_id
  WHERE l.coffee_record_id = p_record_id AND upper(sp.status::text) NOT IN ('FAILED','CANCELLED','REJECTED','REVERSED');
  v_sup := coalesce(v_sup, r.supplier_id);

  IF v_paid > 0 THEN
    IF v_sup IS NULL THEN RAISE EXCEPTION 'Cannot create advance: supplier not linked'; END IF;
    INSERT INTO supplier_advances(supplier_id, issued_by, amount_ugx, outstanding_ugx, description)
    VALUES (v_sup, coalesce(v_actor,'system'), v_paid, v_paid,
      'Overpayment on deleted double entry '||r.batch_number||' ('||r.kilograms||'kg, '||r.date||')'||coalesce(' - '||p_reason,''))
    RETURNING id INTO v_adv;
  END IF;

  -- keep payment history, detach from the lot being removed
  UPDATE supplier_payments SET lot_id = NULL,
    notes = coalesce(notes||' | ','')||'Delivery '||r.batch_number||' deleted as double entry; amount moved to supplier advance '||coalesce(v_adv::text,'-')
  WHERE lot_id IN (SELECT id FROM finance_coffee_lots WHERE coffee_record_id = p_record_id);

  FOR s IN SELECT * FROM inventory_batch_sources WHERE coffee_record_id = p_record_id LOOP
    UPDATE inventory_batches SET total_kilograms = greatest(0,total_kilograms - s.kilograms),
      remaining_kilograms = greatest(0,remaining_kilograms - s.kilograms), updated_at = now() WHERE id = s.batch_id;
    DELETE FROM inventory_batch_sources WHERE id = s.id;
  END LOOP;

  DELETE FROM coffee_records WHERE id = p_record_id;

  INSERT INTO audit_logs(action, table_name, record_id, performed_by, details)
  VALUES ('delete_duplicate_delivery','coffee_records',p_record_id,coalesce(v_actor,'system'),
    jsonb_build_object('batch_number',r.batch_number,'supplier',r.supplier_name,'kg',r.kilograms,'paid',v_paid,'advance_id',v_adv,'reason',p_reason));

  RETURN jsonb_build_object('ok',true,'advance_ugx',v_paid,'advance_id',v_adv);
END $$;
REVOKE ALL ON FUNCTION public.delete_duplicate_coffee_record(text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_duplicate_coffee_record(text,text) TO authenticated;