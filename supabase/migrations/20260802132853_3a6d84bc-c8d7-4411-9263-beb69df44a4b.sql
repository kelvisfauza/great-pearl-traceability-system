-- Branch float ledger
CREATE TABLE IF NOT EXISTS public.v3_float_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.v3_branches(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('credit','debit')),
  amount numeric NOT NULL CHECK (amount > 0),
  balance_after numeric,
  reference text,
  payment_id uuid REFERENCES public.v3_payments(id) ON DELETE SET NULL,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.v3_float_transactions TO authenticated;
GRANT ALL ON public.v3_float_transactions TO service_role;

ALTER TABLE public.v3_float_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "v3_float_read" ON public.v3_float_transactions
  FOR SELECT TO authenticated
  USING (public.has_any_v3_role(auth.uid(), ARRAY['v3_admin','managing_director','operations_manager','finance_manager','finance_officer','branch_manager']::v3_role[]));

CREATE INDEX IF NOT EXISTS idx_v3_float_branch ON public.v3_float_transactions(branch_id, created_at DESC);

-- Allocate processed stock to a contract
CREATE OR REPLACE FUNCTION public.v3_allocate_to_contract(p_contract_id uuid, p_batch_id uuid, p_kilograms numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_batch public.v3_stock_batches; v_contract public.v3_contracts; v_remaining numeric; v_alloc_id uuid;
BEGIN
  IF NOT public.has_any_v3_role(auth.uid(), ARRAY['v3_admin','managing_director','operations_manager','trade_manager','export_manager']::v3_role[]) THEN
    RAISE EXCEPTION 'Only trade or export managers can allocate stock to contracts';
  END IF;
  IF COALESCE(p_kilograms,0) <= 0 THEN RAISE EXCEPTION 'Allocation quantity must be greater than zero'; END IF;

  SELECT * INTO v_batch FROM public.v3_stock_batches WHERE id = p_batch_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Stock batch not found'; END IF;
  SELECT * INTO v_contract FROM public.v3_contracts WHERE id = p_contract_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contract not found'; END IF;

  IF v_batch.state NOT IN ('processed_stock','export_ready','allocated') THEN
    RAISE EXCEPTION 'Only processed or export-ready stock can be allocated (batch is %)', v_batch.state;
  END IF;
  IF COALESCE(v_batch.available_kilograms,0) < p_kilograms THEN
    RAISE EXCEPTION 'Batch % only has % kg available', v_batch.batch_number, COALESCE(v_batch.available_kilograms,0);
  END IF;

  v_remaining := COALESCE(v_contract.quantity_kg,0) - COALESCE(v_contract.allocated_kg,0);
  IF p_kilograms > v_remaining THEN
    RAISE EXCEPTION 'Contract % only needs % kg more', v_contract.contract_number, v_remaining;
  END IF;

  INSERT INTO public.v3_contract_allocations (contract_id, batch_id, kilograms, allocated_by)
  VALUES (p_contract_id, p_batch_id, p_kilograms, auth.uid()) RETURNING id INTO v_alloc_id;

  UPDATE public.v3_stock_batches
     SET available_kilograms = COALESCE(available_kilograms,0) - p_kilograms,
         state = 'allocated',
         updated_at = now()
   WHERE id = p_batch_id;

  UPDATE public.v3_contracts
     SET allocated_kg = COALESCE(allocated_kg,0) + p_kilograms,
         status = CASE WHEN COALESCE(allocated_kg,0) + p_kilograms >= COALESCE(quantity_kg,0) THEN 'allocated' ELSE COALESCE(status,'active') END,
         updated_at = now()
   WHERE id = p_contract_id;

  PERFORM public.v3_log('allocate_contract', 'v3_contract_allocations', v_alloc_id,
    jsonb_build_object('contract_id', p_contract_id, 'batch_id', p_batch_id, 'kilograms', p_kilograms), NULL);

  RETURN jsonb_build_object('allocation_id', v_alloc_id, 'contract_number', v_contract.contract_number, 'batch_number', v_batch.batch_number, 'kilograms', p_kilograms);
END;
$$;

-- Release an allocation back to stock
CREATE OR REPLACE FUNCTION public.v3_release_allocation(p_allocation_id uuid, p_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_alloc public.v3_contract_allocations;
BEGIN
  IF NOT public.has_any_v3_role(auth.uid(), ARRAY['v3_admin','managing_director','operations_manager','trade_manager','export_manager']::v3_role[]) THEN
    RAISE EXCEPTION 'Not permitted to release allocations';
  END IF;

  SELECT * INTO v_alloc FROM public.v3_contract_allocations WHERE id = p_allocation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Allocation not found'; END IF;

  UPDATE public.v3_stock_batches
     SET available_kilograms = COALESCE(available_kilograms,0) + v_alloc.kilograms,
         state = 'export_ready', updated_at = now()
   WHERE id = v_alloc.batch_id;

  UPDATE public.v3_contracts
     SET allocated_kg = GREATEST(COALESCE(allocated_kg,0) - v_alloc.kilograms, 0),
         status = 'active', updated_at = now()
   WHERE id = v_alloc.contract_id;

  DELETE FROM public.v3_contract_allocations WHERE id = p_allocation_id;

  PERFORM public.v3_log('release_allocation', 'v3_contract_allocations', p_allocation_id,
    jsonb_build_object('kilograms', v_alloc.kilograms), p_reason);

  RETURN jsonb_build_object('released_kg', v_alloc.kilograms);
END;
$$;

-- Load a shipment (document locked)
CREATE OR REPLACE FUNCTION public.v3_load_shipment(
  p_shipment_id uuid, p_loaded_kg numeric, p_bags integer DEFAULT NULL,
  p_container text DEFAULT NULL, p_seal text DEFAULT NULL, p_tare_kg numeric DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ship public.v3_export_shipments; v_missing int; v_alloc numeric;
BEGIN
  IF NOT public.has_any_v3_role(auth.uid(), ARRAY['v3_admin','managing_director','operations_manager','export_manager','export_officer']::v3_role[]) THEN
    RAISE EXCEPTION 'Only export staff can load shipments';
  END IF;
  IF COALESCE(p_loaded_kg,0) <= 0 THEN RAISE EXCEPTION 'Loaded weight is required'; END IF;

  SELECT * INTO v_ship FROM public.v3_export_shipments WHERE id = p_shipment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Shipment not found'; END IF;
  IF v_ship.status = 'loaded' OR v_ship.status = 'shipped' THEN RAISE EXCEPTION 'Shipment is already %', v_ship.status; END IF;
  IF NOT COALESCE(v_ship.quality_approved,false) THEN RAISE EXCEPTION 'Quality has not approved this shipment'; END IF;
  IF COALESCE(p_container, v_ship.container_number) IS NULL OR COALESCE(p_seal, v_ship.seal_number) IS NULL THEN
    RAISE EXCEPTION 'Container number and seal number are required before loading';
  END IF;

  SELECT count(*) INTO v_missing FROM public.v3_export_documents
   WHERE shipment_id = p_shipment_id AND mandatory = true AND COALESCE(status,'pending') <> 'approved';
  IF v_missing > 0 THEN RAISE EXCEPTION '% mandatory export document(s) are still unapproved', v_missing; END IF;

  IF v_ship.contract_id IS NOT NULL THEN
    SELECT COALESCE(sum(kilograms),0) INTO v_alloc FROM public.v3_contract_allocations WHERE contract_id = v_ship.contract_id;
    IF p_loaded_kg > v_alloc THEN
      RAISE EXCEPTION 'Only % kg has been allocated to this contract', v_alloc;
    END IF;
  END IF;

  UPDATE public.v3_export_shipments
     SET loaded_kg = p_loaded_kg,
         bags = COALESCE(p_bags, bags),
         container_number = COALESCE(p_container, container_number),
         seal_number = COALESCE(p_seal, seal_number),
         container_tare_kg = COALESCE(p_tare_kg, container_tare_kg),
         status = 'loaded',
         loading_approved_by = auth.uid(),
         loading_approved_at = now(),
         updated_at = now()
   WHERE id = p_shipment_id;

  IF v_ship.contract_id IS NOT NULL THEN
    UPDATE public.v3_contracts
       SET shipped_kg = COALESCE(shipped_kg,0) + p_loaded_kg,
           status = CASE WHEN COALESCE(shipped_kg,0) + p_loaded_kg >= COALESCE(quantity_kg,0) THEN 'completed' ELSE status END,
           updated_at = now()
     WHERE id = v_ship.contract_id;
  END IF;

  PERFORM public.v3_log('load_shipment', 'v3_export_shipments', p_shipment_id,
    jsonb_build_object('loaded_kg', p_loaded_kg, 'container', COALESCE(p_container, v_ship.container_number)), NULL);

  RETURN jsonb_build_object('shipment_number', v_ship.shipment_number, 'loaded_kg', p_loaded_kg);
END;
$$;

-- Top up branch float
CREATE OR REPLACE FUNCTION public.v3_topup_branch_float(p_branch_id uuid, p_amount numeric, p_reference text DEFAULT NULL, p_note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_balance numeric;
BEGIN
  IF NOT public.has_any_v3_role(auth.uid(), ARRAY['v3_admin','managing_director','finance_manager']::v3_role[]) THEN
    RAISE EXCEPTION 'Only finance managers can top up a branch float';
  END IF;
  IF COALESCE(p_amount,0) <= 0 THEN RAISE EXCEPTION 'Amount must be greater than zero'; END IF;

  UPDATE public.v3_branches SET float_balance = COALESCE(float_balance,0) + p_amount, updated_at = now()
   WHERE id = p_branch_id RETURNING float_balance INTO v_balance;
  IF v_balance IS NULL THEN RAISE EXCEPTION 'Branch not found'; END IF;

  INSERT INTO public.v3_float_transactions (branch_id, direction, amount, balance_after, reference, note, created_by)
  VALUES (p_branch_id, 'credit', p_amount, v_balance, p_reference, p_note, auth.uid());

  PERFORM public.v3_log('float_topup', 'v3_branches', p_branch_id, jsonb_build_object('amount', p_amount, 'balance', v_balance), p_note);
  RETURN jsonb_build_object('balance', v_balance);
END;
$$;

-- Approve a supplier payment
CREATE OR REPLACE FUNCTION public.v3_approve_payment(p_payment_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pay public.v3_payments;
BEGIN
  IF NOT public.has_any_v3_role(auth.uid(), ARRAY['v3_admin','managing_director','finance_manager']::v3_role[]) THEN
    RAISE EXCEPTION 'Only a finance manager can approve payments';
  END IF;
  SELECT * INTO v_pay FROM public.v3_payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found'; END IF;
  IF v_pay.status <> 'pending_approval' AND v_pay.status <> 'draft' THEN RAISE EXCEPTION 'Payment is already %', v_pay.status; END IF;
  IF v_pay.prepared_by = auth.uid() THEN RAISE EXCEPTION 'You cannot approve a payment you prepared'; END IF;

  UPDATE public.v3_payments SET status = 'approved', approved_by = auth.uid(), approved_at = now(), updated_at = now()
   WHERE id = p_payment_id;

  PERFORM public.v3_log('approve_payment', 'v3_payments', p_payment_id, jsonb_build_object('amount', v_pay.amount), NULL);
  RETURN jsonb_build_object('payment_number', v_pay.payment_number, 'status', 'approved');
END;
$$;

-- Execute an approved payment against the branch float
CREATE OR REPLACE FUNCTION public.v3_execute_payment(p_payment_id uuid, p_method text DEFAULT 'cash', p_reference text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pay public.v3_payments; v_balance numeric;
BEGIN
  IF NOT public.has_any_v3_role(auth.uid(), ARRAY['v3_admin','managing_director','finance_manager','finance_officer']::v3_role[]) THEN
    RAISE EXCEPTION 'Only finance staff can execute payments';
  END IF;
  SELECT * INTO v_pay FROM public.v3_payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found'; END IF;
  IF v_pay.status <> 'approved' THEN RAISE EXCEPTION 'Payment must be approved first (currently %)', v_pay.status; END IF;
  IF v_pay.branch_id IS NULL THEN RAISE EXCEPTION 'Payment has no branch float to draw from'; END IF;

  SELECT COALESCE(float_balance,0) INTO v_balance FROM public.v3_branches WHERE id = v_pay.branch_id FOR UPDATE;
  IF v_balance < v_pay.amount THEN
    UPDATE public.v3_payments SET failure_reason = 'Insufficient branch float', updated_at = now() WHERE id = p_payment_id;
    RAISE EXCEPTION 'Branch float has only % available for a payment of %', v_balance, v_pay.amount;
  END IF;

  UPDATE public.v3_branches SET float_balance = v_balance - v_pay.amount, updated_at = now() WHERE id = v_pay.branch_id;

  UPDATE public.v3_payments
     SET status = 'paid', method = COALESCE(p_method, method), transaction_reference = p_reference,
         paid_at = now(), failure_reason = NULL, updated_at = now()
   WHERE id = p_payment_id;

  INSERT INTO public.v3_float_transactions (branch_id, direction, amount, balance_after, reference, payment_id, note, created_by)
  VALUES (v_pay.branch_id, 'debit', v_pay.amount, v_balance - v_pay.amount, p_reference, p_payment_id,
          'Supplier payment ' || v_pay.payment_number, auth.uid());

  PERFORM public.v3_log('execute_payment', 'v3_payments', p_payment_id,
    jsonb_build_object('amount', v_pay.amount, 'method', p_method, 'float_after', v_balance - v_pay.amount), NULL);

  RETURN jsonb_build_object('payment_number', v_pay.payment_number, 'float_balance', v_balance - v_pay.amount);
END;
$$;