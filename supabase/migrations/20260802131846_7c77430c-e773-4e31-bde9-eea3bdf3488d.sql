
-- Sequence helper --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.v3_next_number(p_prefix text, p_table text, p_column text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_year text := to_char(now(), 'YYYY'); v_count int; v_pat text;
BEGIN
  v_pat := 'YEDA/' || p_prefix || '/' || v_year || '/%';
  EXECUTE format('SELECT count(*) FROM public.%I WHERE %I LIKE $1', p_table, p_column)
    INTO v_count USING v_pat;
  RETURN 'YEDA/' || p_prefix || '/' || v_year || '/' || lpad((v_count + 1)::text, 4, '0');
END; $$;

CREATE OR REPLACE FUNCTION public.v3_log(p_action text, p_entity text, p_id uuid, p_after jsonb DEFAULT NULL, p_reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.v3_audit_log(actor_id, actor_name, action, entity_type, entity_id, after_data, reason)
  VALUES (auth.uid(), (SELECT name FROM public.employees WHERE auth_user_id = auth.uid() LIMIT 1),
          p_action, p_entity, p_id, p_after, p_reason);
END; $$;

-- 1. Issue GRN ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.v3_issue_grn(p_receiving_id uuid, p_unit_price numeric DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; v_price numeric; v_amount numeric; v_grn uuid; v_batch uuid; v_pay uuid;
        v_grn_no text; v_batch_no text; v_pay_no text;
BEGIN
  IF NOT (public.has_any_v3_role(auth.uid(), ARRAY['store_manager','branch_manager','quality_manager']::v3_role[])
          OR public.is_v3_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Not authorised to issue GRNs';
  END IF;

  SELECT * INTO r FROM public.v3_receiving_records WHERE id = p_receiving_id FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Receiving record not found'; END IF;
  IF r.status <> 'approved' THEN RAISE EXCEPTION 'Delivery must be approved before a GRN is issued (current: %)', r.status; END IF;
  IF COALESCE(r.net_weight, 0) <= 0 THEN RAISE EXCEPTION 'Net weight must be captured before issuing a GRN'; END IF;

  v_price := COALESCE(p_unit_price, r.final_price, r.reference_price);
  IF COALESCE(v_price, 0) <= 0 THEN RAISE EXCEPTION 'A unit price is required before issuing a GRN'; END IF;
  v_amount := round(v_price * r.net_weight, 2);

  v_grn_no   := public.v3_next_number('GRN', 'v3_grns', 'grn_number');
  v_batch_no := public.v3_next_number('BAT', 'v3_stock_batches', 'batch_number');
  v_pay_no   := public.v3_next_number('PAY', 'v3_payments', 'payment_number');

  INSERT INTO public.v3_grns(grn_number, receiving_id, branch_id, supplier_id, net_weight, bags, unit_price, total_amount, issued_by, issued_at)
  VALUES (v_grn_no, r.id, r.branch_id, r.supplier_id, r.net_weight, r.bags, v_price, v_amount, auth.uid(), now())
  RETURNING id INTO v_grn;

  INSERT INTO public.v3_stock_batches(batch_number, branch_id, coffee_type, grade, state, bags, kilograms, available_kilograms, average_cost, source_receiving_ids, created_by)
  VALUES (v_batch_no, r.branch_id, r.coffee_type, NULL, 'branch_stock', r.bags, r.net_weight, r.net_weight, v_price, to_jsonb(ARRAY[r.id]), auth.uid())
  RETURNING id INTO v_batch;

  INSERT INTO public.v3_payments(payment_number, grn_id, supplier_id, branch_id, amount, currency, method, status, prepared_by)
  VALUES (v_pay_no, v_grn, r.supplier_id, r.branch_id, v_amount, 'UGX', 'mobile_money', 'pending_approval', auth.uid())
  RETURNING id INTO v_pay;

  UPDATE public.v3_receiving_records
     SET status = 'grn_issued', final_price = v_price, total_amount = v_amount, updated_at = now()
   WHERE id = r.id;

  PERFORM public.v3_log('grn_issued', 'v3_grn', v_grn, jsonb_build_object('grn_number', v_grn_no, 'amount', v_amount));
  RETURN jsonb_build_object('grn_id', v_grn, 'grn_number', v_grn_no, 'batch_id', v_batch, 'batch_number', v_batch_no, 'payment_id', v_pay, 'payment_number', v_pay_no, 'amount', v_amount);
END; $$;

-- 2. Dispatch transfer ----------------------------------------------------
CREATE OR REPLACE FUNCTION public.v3_dispatch_transfer(
  p_batch_id uuid, p_to_branch_id uuid, p_bags integer, p_kg numeric,
  p_vehicle text DEFAULT NULL, p_driver text DEFAULT NULL, p_seal text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b record; v_id uuid; v_no text;
BEGIN
  IF NOT (public.has_any_v3_role(auth.uid(), ARRAY['store_manager','branch_manager','logistics_manager']::v3_role[])
          OR public.is_v3_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Not authorised to dispatch transfers';
  END IF;

  SELECT * INTO b FROM public.v3_stock_batches WHERE id = p_batch_id FOR UPDATE;
  IF b.id IS NULL THEN RAISE EXCEPTION 'Batch not found'; END IF;
  IF p_kg <= 0 OR p_kg > b.available_kilograms THEN
    RAISE EXCEPTION 'Dispatch weight exceeds available stock (% kg)', b.available_kilograms;
  END IF;

  v_no := public.v3_next_number('TRF', 'v3_transfers', 'transfer_number');
  INSERT INTO public.v3_transfers(transfer_number, from_branch_id, to_branch_id, batch_id, status, bags, dispatch_weight, vehicle, driver_name, seal_number, dispatched_at, created_by)
  VALUES (v_no, b.branch_id, p_to_branch_id, b.id, 'dispatched', p_bags, p_kg, p_vehicle, p_driver, p_seal, now(), auth.uid())
  RETURNING id INTO v_id;

  UPDATE public.v3_stock_batches
     SET available_kilograms = available_kilograms - p_kg,
         state = CASE WHEN available_kilograms - p_kg <= 0 THEN 'in_transit'::v3_stock_state ELSE state END,
         updated_at = now()
   WHERE id = b.id;

  PERFORM public.v3_log('transfer_dispatched', 'v3_transfer', v_id, jsonb_build_object('transfer_number', v_no, 'kg', p_kg));
  RETURN jsonb_build_object('transfer_id', v_id, 'transfer_number', v_no);
END; $$;

-- 3. Receive transfer -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.v3_receive_transfer(
  p_transfer_id uuid, p_arrival_weight numeric, p_seal_intact boolean DEFAULT true, p_notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t record; src record; v_var numeric; v_status v3_transfer_status; v_batch uuid; v_no text;
BEGIN
  IF NOT (public.has_any_v3_role(auth.uid(), ARRAY['store_manager','branch_manager','logistics_manager']::v3_role[])
          OR public.is_v3_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Not authorised to receive transfers';
  END IF;

  SELECT * INTO t FROM public.v3_transfers WHERE id = p_transfer_id FOR UPDATE;
  IF t.id IS NULL THEN RAISE EXCEPTION 'Transfer not found'; END IF;
  IF t.status IN ('received','received_with_variance','cancelled') THEN RAISE EXCEPTION 'Transfer already closed'; END IF;

  v_var := round(COALESCE(p_arrival_weight,0) - COALESCE(t.dispatch_weight,0), 3);
  v_status := CASE WHEN v_var <> 0 OR p_seal_intact = false THEN 'received_with_variance' ELSE 'received' END;

  SELECT * INTO src FROM public.v3_stock_batches WHERE id = t.batch_id;
  v_no := public.v3_next_number('BAT', 'v3_stock_batches', 'batch_number');

  INSERT INTO public.v3_stock_batches(batch_number, branch_id, coffee_type, grade, state, bags, kilograms, available_kilograms, average_cost, source_receiving_ids, created_by)
  VALUES (v_no, t.to_branch_id, COALESCE(src.coffee_type,'Unknown'), src.grade, 'main_store_received', t.bags, p_arrival_weight, p_arrival_weight, src.average_cost, src.source_receiving_ids, auth.uid())
  RETURNING id INTO v_batch;

  UPDATE public.v3_transfers
     SET status = v_status, arrival_weight = p_arrival_weight, variance_kg = v_var,
         seal_intact = p_seal_intact, arrived_at = now(), received_by = auth.uid(),
         notes = COALESCE(p_notes, notes), updated_at = now()
   WHERE id = t.id;

  PERFORM public.v3_log('transfer_received', 'v3_transfer', t.id, jsonb_build_object('variance_kg', v_var, 'status', v_status));
  RETURN jsonb_build_object('status', v_status, 'variance_kg', v_var, 'batch_id', v_batch, 'batch_number', v_no);
END; $$;

-- 4. Start production run -------------------------------------------------
CREATE OR REPLACE FUNCTION public.v3_start_production_run(
  p_batch_id uuid, p_input_kg numeric, p_machine text DEFAULT NULL, p_method text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b record; v_id uuid; v_no text;
BEGIN
  IF NOT (public.has_any_v3_role(auth.uid(), ARRAY['production_manager','production_operator','store_manager']::v3_role[])
          OR public.is_v3_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Not authorised to start production runs';
  END IF;

  SELECT * INTO b FROM public.v3_stock_batches WHERE id = p_batch_id FOR UPDATE;
  IF b.id IS NULL THEN RAISE EXCEPTION 'Batch not found'; END IF;
  IF p_input_kg <= 0 OR p_input_kg > b.available_kilograms THEN
    RAISE EXCEPTION 'Input exceeds available stock (% kg)', b.available_kilograms;
  END IF;

  v_no := public.v3_next_number('PRD', 'v3_production_runs', 'run_number');
  INSERT INTO public.v3_production_runs(run_number, batch_id, machine, processing_method, input_kg, operator_id, status, started_at, created_by)
  VALUES (v_no, b.id, p_machine, p_method, p_input_kg, auth.uid(), 'running', now(), auth.uid())
  RETURNING id INTO v_id;

  UPDATE public.v3_stock_batches
     SET available_kilograms = available_kilograms - p_input_kg, state = 'production', updated_at = now()
   WHERE id = b.id;

  PERFORM public.v3_log('production_started', 'v3_production_run', v_id, jsonb_build_object('run_number', v_no, 'input_kg', p_input_kg));
  RETURN jsonb_build_object('run_id', v_id, 'run_number', v_no);
END; $$;

-- 5. Complete production run ----------------------------------------------
CREATE OR REPLACE FUNCTION public.v3_complete_production_run(
  p_run_id uuid, p_exportable numeric, p_black numeric DEFAULT 0, p_triage numeric DEFAULT 0,
  p_husks numeric DEFAULT 0, p_pods numeric DEFAULT 0, p_dust numeric DEFAULT 0,
  p_moisture_loss numeric DEFAULT 0, p_grade text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; src record; v_total numeric; v_var numeric; v_status text; v_batch uuid; v_no text;
BEGIN
  IF NOT (public.has_any_v3_role(auth.uid(), ARRAY['production_manager','production_operator']::v3_role[])
          OR public.is_v3_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Not authorised to complete production runs';
  END IF;

  SELECT * INTO r FROM public.v3_production_runs WHERE id = p_run_id FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Production run not found'; END IF;
  IF r.status <> 'running' THEN RAISE EXCEPTION 'Run is not in progress (current: %)', r.status; END IF;

  v_total := COALESCE(p_exportable,0)+COALESCE(p_black,0)+COALESCE(p_triage,0)+COALESCE(p_husks,0)
             +COALESCE(p_pods,0)+COALESCE(p_dust,0)+COALESCE(p_moisture_loss,0);
  v_var := round(v_total - r.input_kg, 3);
  v_status := CASE WHEN abs(v_var) > (r.input_kg * 0.02) THEN 'variance_review' ELSE 'completed' END;

  SELECT * INTO src FROM public.v3_stock_batches WHERE id = r.batch_id;
  v_no := public.v3_next_number('BAT', 'v3_stock_batches', 'batch_number');

  INSERT INTO public.v3_stock_batches(batch_number, branch_id, coffee_type, grade, state, bags, kilograms, available_kilograms, average_cost, source_receiving_ids, created_by)
  VALUES (v_no, src.branch_id, COALESCE(src.coffee_type,'Unknown'), COALESCE(p_grade, src.grade), 'processed_stock',
          0, COALESCE(p_exportable,0), COALESCE(p_exportable,0), src.average_cost, src.source_receiving_ids, auth.uid())
  RETURNING id INTO v_batch;

  UPDATE public.v3_production_runs
     SET output_exportable_kg = p_exportable, output_black_kg = p_black, output_triage_kg = p_triage,
         output_husks_kg = p_husks, output_pods_kg = p_pods, output_dust_kg = p_dust,
         moisture_loss_kg = p_moisture_loss, variance_kg = v_var, confirmed_input_kg = r.input_kg,
         status = v_status, ended_at = now(), updated_at = now()
   WHERE id = r.id;

  UPDATE public.v3_stock_batches
     SET state = CASE WHEN available_kilograms > 0 THEN state ELSE 'processed_stock'::v3_stock_state END, updated_at = now()
   WHERE id = src.id;

  PERFORM public.v3_log('production_completed', 'v3_production_run', r.id, jsonb_build_object('variance_kg', v_var, 'status', v_status));
  RETURN jsonb_build_object('status', v_status, 'variance_kg', v_var, 'batch_id', v_batch, 'batch_number', v_no);
END; $$;

GRANT EXECUTE ON FUNCTION public.v3_issue_grn(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.v3_dispatch_transfer(uuid, uuid, integer, numeric, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.v3_receive_transfer(uuid, numeric, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.v3_start_production_run(uuid, numeric, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.v3_complete_production_run(uuid, numeric, numeric, numeric, numeric, numeric, numeric, numeric, text) TO authenticated;
