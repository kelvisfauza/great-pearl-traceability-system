CREATE OR REPLACE FUNCTION store_dispatch_private.confirm_clearance_procurement(p_clearance_id uuid,p_basis text,p_contract_id uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_form public.store_clearance_forms; v_contract public.buyer_contracts;
BEGIN
 IF NOT store_dispatch_private.can_confirm_clearance() THEN RETURN jsonb_build_object('ok',false,'error','Only active Procurement staff or administrators can confirm'); END IF;
 SELECT * INTO v_form FROM public.store_clearance_forms WHERE id=p_clearance_id FOR UPDATE;
 IF NOT FOUND OR v_form.procurement_status<>'pending' THEN RETURN jsonb_build_object('ok',false,'error','This clearance is not awaiting confirmation'); END IF;
 IF v_form.sale_id IS NOT NULL THEN RETURN jsonb_build_object('ok',false,'error','This clearance already has a sale attached'); END IF;
 IF p_basis NOT IN ('contract','spot') OR p_basis IS NULL THEN RETURN jsonb_build_object('ok',false,'error','Choose contract or selling on spot'); END IF;
 IF p_basis='contract' THEN
  SELECT * INTO v_contract FROM public.buyer_contracts WHERE id=p_contract_id FOR SHARE;
  IF NOT FOUND OR lower(coalesce(v_contract.status,'')) IN ('cancelled','canceled','closed','completed') THEN RETURN jsonb_build_object('ok',false,'error','Choose an available buyer contract'); END IF;
 END IF;
 UPDATE public.store_clearance_forms SET procurement_status='confirmed',sale_basis=p_basis,contract_id=CASE WHEN p_basis='contract' THEN p_contract_id ELSE NULL END,procurement_confirmed_by=public.current_user_email(),procurement_confirmed_at=now() WHERE id=p_clearance_id;
 RETURN jsonb_build_object('ok',true);
END $$;
REVOKE ALL ON FUNCTION store_dispatch_private.confirm_clearance_procurement(uuid,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION store_dispatch_private.confirm_clearance_procurement(uuid,text,uuid) TO authenticated,service_role;