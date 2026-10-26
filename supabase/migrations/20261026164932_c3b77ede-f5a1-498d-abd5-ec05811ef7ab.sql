CREATE OR REPLACE FUNCTION public.guard_clearance_procurement() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
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
  IF OLD.procurement_status<>'legacy' AND (NEW.items IS DISTINCT FROM OLD.items OR NEW.destination_buyer IS DISTINCT FROM OLD.destination_buyer OR NEW.dispatch_report_id IS DISTINCT FROM OLD.dispatch_report_id) THEN RAISE EXCEPTION 'Saved clearance details cannot be changed'; END IF;
 END IF;
 RETURN NEW;
END $$;