ALTER TABLE public.store_clearance_forms ADD COLUMN procurement_status text NOT NULL DEFAULT 'legacy', ADD COLUMN sale_basis text, ADD COLUMN procurement_confirmed_by text, ADD COLUMN procurement_confirmed_at timestamptz;
CREATE OR REPLACE FUNCTION store_dispatch_private.can_confirm_clearance() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT auth.uid() IS NOT NULL AND (public.can_admin_store_dispatch() OR EXISTS(SELECT 1 FROM public.employees e WHERE lower(e.email)=lower(public.current_user_email()) AND lower(e.status)='active' AND NOT coalesce(e.disabled,false) AND EXISTS(SELECT 1 FROM unnest(coalesce(e.permissions,ARRAY[]::text[])) p WHERE p IN ('*','Procurement','Procurement Management') OR p LIKE 'Procurement:%' OR p LIKE 'Procurement Management:%'))) $$;
REVOKE ALL ON FUNCTION store_dispatch_private.can_confirm_clearance() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION store_dispatch_private.can_confirm_clearance() TO authenticated,service_role;
CREATE POLICY "Procurement views clearance requests" ON public.store_clearance_forms FOR SELECT TO authenticated USING (store_dispatch_private.can_confirm_clearance());
GRANT SELECT ON public.store_clearance_forms TO authenticated;
GRANT ALL ON public.store_clearance_forms TO service_role;
CREATE OR REPLACE FUNCTION public.guard_clearance_procurement() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE v_item jsonb; v_batch public.inventory_batches; v_items jsonb:='[]'; v_weight numeric;
BEGIN
 IF TG_OP='INSERT' THEN
  NEW.procurement_status:='pending'; NEW.sale_basis:=NULL; NEW.contract_id:=NULL; NEW.procurement_confirmed_by:=NULL; NEW.procurement_confirmed_at:=NULL; NEW.dispatch_report_id:=NULL; NEW.attachments:='[]';
  IF jsonb_typeof(NEW.items)<>'array' OR jsonb_array_length(NEW.items)=0 THEN RAISE EXCEPTION 'Choose at least one inventory batch'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.items) i GROUP BY i->>'batch_id' HAVING count(*)>1) THEN RAISE EXCEPTION 'Choose each batch only once'; END IF;
  FOR v_item IN SELECT value FROM jsonb_array_elements(NEW.items) LOOP
   SELECT * INTO v_batch FROM public.inventory_batches WHERE id=(v_item->>'batch_id')::uuid FOR SHARE;
   IF NOT FOUND THEN RAISE EXCEPTION 'Choose an existing inventory batch'; END IF;
   v_weight:=coalesce((v_item->>'weight_kg')::numeric,0);
   IF v_weight<=0 OR v_weight>v_batch.remaining_kilograms THEN RAISE EXCEPTION 'Released weight exceeds available batch stock'; END IF;
   v_items:=v_items||jsonb_build_array(v_item||jsonb_build_object('lot_ref',v_batch.batch_code,'coffee_type',v_batch.coffee_type));
  END LOOP;
  NEW.items:=v_items;
 ELSE
  IF (NEW.procurement_status,NEW.sale_basis,NEW.contract_id,NEW.procurement_confirmed_by,NEW.procurement_confirmed_at) IS DISTINCT FROM (OLD.procurement_status,OLD.sale_basis,OLD.contract_id,OLD.procurement_confirmed_by,OLD.procurement_confirmed_at) AND current_user NOT IN ('postgres','supabase_admin') THEN RAISE EXCEPTION 'Use Procurement confirmation to choose a contract or spot sale'; END IF;
  IF OLD.procurement_status<>'legacy' AND (NEW.items IS DISTINCT FROM OLD.items OR NEW.destination_buyer IS DISTINCT FROM OLD.destination_buyer OR NEW.dispatch_report_id IS DISTINCT FROM OLD.dispatch_report_id OR NEW.attachments IS DISTINCT FROM OLD.attachments) THEN RAISE EXCEPTION 'Saved clearance details cannot be changed'; END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_clearance_procurement() FROM PUBLIC;
CREATE TRIGGER a_guard_clearance_procurement BEFORE INSERT OR UPDATE ON public.store_clearance_forms FOR EACH ROW EXECUTE FUNCTION public.guard_clearance_procurement();
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
  IF lower(btrim(v_contract.buyer_name))<>lower(btrim(v_form.destination_buyer)) THEN RETURN jsonb_build_object('ok',false,'error','Contract buyer must match the clearance buyer'); END IF;
 END IF;
 UPDATE public.store_clearance_forms SET procurement_status='confirmed',sale_basis=p_basis,contract_id=CASE WHEN p_basis='contract' THEN p_contract_id ELSE NULL END,procurement_confirmed_by=public.current_user_email(),procurement_confirmed_at=now() WHERE id=p_clearance_id;
 RETURN jsonb_build_object('ok',true);
END $$;
REVOKE ALL ON FUNCTION store_dispatch_private.confirm_clearance_procurement(uuid,text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION store_dispatch_private.confirm_clearance_procurement(uuid,text,uuid) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.confirm_clearance_procurement(p_clearance_id uuid,p_basis text,p_contract_id uuid DEFAULT NULL) RETURNS jsonb LANGUAGE sql SET search_path=public AS $$ SELECT store_dispatch_private.confirm_clearance_procurement(p_clearance_id,p_basis,p_contract_id); $$;
REVOKE ALL ON FUNCTION public.confirm_clearance_procurement(uuid,text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_clearance_procurement(uuid,text,uuid) TO authenticated,service_role;
DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='store_clearance_forms') THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.store_clearance_forms; END IF; END $$;