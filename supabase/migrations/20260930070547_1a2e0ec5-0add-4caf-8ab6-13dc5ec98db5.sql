ALTER TABLE public.quality_sampling_orders
  ADD COLUMN IF NOT EXISTS finance_grn_number text,
  ADD COLUMN IF NOT EXISTS finance_grn_attached_by text,
  ADD COLUMN IF NOT EXISTS finance_grn_attached_at timestamptz;

CREATE OR REPLACE FUNCTION public.attach_sampling_order_grn(p_order_id uuid, p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order record;
  v_code text := upper(trim(coalesce(p_code,'')));
  v_batch text;
  v_name text;
BEGIN
  IF NOT (public.can_process_finance() OR public.can_approve_finance()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Only Finance can attach a GRN');
  END IF;
  SELECT * INTO v_order FROM public.quality_sampling_orders WHERE id = p_order_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Sampling order not found'); END IF;
  IF v_order.linked_batch_number IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This sample is not linked to a delivered lot yet');
  END IF;
  v_code := regexp_replace(v_code, '^(GAC-|GRN-DISC-|GRN-)', '');
  IF v_code ~ '^\d{6,16}$' THEN
    v_batch := v_code;
  ELSE
    v_batch := public.resolve_grn_reference(v_code);
  END IF;
  IF v_batch IS NULL OR v_batch = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'GRN not recognised — rescan or type the number printed on it');
  END IF;
  IF v_batch <> v_order.linked_batch_number THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This GRN is for batch ' || v_batch || ', but the sample is for batch ' || v_order.linked_batch_number);
  END IF;
  SELECT name INTO v_name FROM public.employees WHERE lower(email) = lower(public.current_user_email()) LIMIT 1;
  UPDATE public.quality_sampling_orders
     SET finance_grn_number = 'GRN-' || v_batch,
         finance_grn_attached_by = coalesce(v_name, public.current_user_email()),
         finance_grn_attached_at = now()
   WHERE id = p_order_id;
  RETURN jsonb_build_object('ok', true, 'batch', v_batch);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.attach_sampling_order_grn(uuid, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.attach_sampling_order_grn(uuid, text) TO authenticated;