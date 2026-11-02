CREATE OR REPLACE FUNCTION public.guard_clearance_procurement()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
DECLARE v_item jsonb; v_batch public.inventory_batches; v_items jsonb:='[]'; v_weight numeric;
BEGIN
 IF TG_OP='INSERT' AND current_setting('app.legacy_clearance', true)='on' THEN
  NEW.procurement_status:='legacy'; NEW.sale_basis:=NULL; NEW.contract_id:=NULL; NEW.procurement_confirmed_by:=NULL; NEW.procurement_confirmed_at:=NULL; NEW.dispatch_report_id:=NULL; NEW.attachments:='[]';
  RETURN NEW;
 END IF;
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
END $function$;

CREATE OR REPLACE FUNCTION public.prepare_store_dispatch_pair()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
DECLARE v_seq bigint; v_year text;
BEGIN
 IF TG_OP='DELETE' THEN IF OLD.sale_id IS NOT NULL THEN RAISE EXCEPTION 'Linked delivery notes cannot be deleted'; END IF; RETURN OLD; END IF;
 IF TG_OP='INSERT' AND current_setting('app.legacy_clearance', true)='on' THEN
  IF nullif(btrim(NEW.form_number),'') IS NULL THEN RAISE EXCEPTION 'Enter the paper form number'; END IF;
  IF jsonb_typeof(NEW.items)<>'array' OR jsonb_array_length(NEW.items)=0 THEN RAISE EXCEPTION 'Add at least one coffee line'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.items) i WHERE nullif(btrim(i->>'coffee_type'),'') IS NULL OR coalesce((i->>'weight_kg')::numeric,0)<=0 OR coalesce((i->>'bags')::numeric,0)<0) THEN RAISE EXCEPTION 'Each coffee line needs a type, positive weight and non-negative bags'; END IF;
  SELECT sum((i->>'weight_kg')::numeric),sum(coalesce((i->>'bags')::numeric,0)) INTO NEW.total_weight_kg,NEW.total_bags FROM jsonb_array_elements(NEW.items) i;
  NEW.delivery_note_number:=NULL; NEW.sale_id:=NULL; NEW.created_by:=public.current_user_email();
  RETURN NEW;
 END IF;
 IF TG_OP='INSERT' THEN
  IF NEW.sale_id IS NOT NULL THEN RAISE EXCEPTION 'Save the clearance before attaching a sale'; END IF;
  v_seq:=nextval('public.store_dispatch_document_seq'); v_year:=to_char(current_date,'YYYY');
  NEW.form_number:='SC-'||v_year||'-'||lpad(v_seq::text,6,'0');
  NEW.delivery_note_number:='DN-'||v_year||'-'||lpad(v_seq::text,6,'0');
  NEW.created_by:=public.current_user_email(); NEW.sale_attached_by:=NULL; NEW.sale_attached_at:=NULL;
 ELSE
  IF OLD.delivery_note_number IS NOT NULL AND (NEW.form_number IS DISTINCT FROM OLD.form_number OR NEW.delivery_note_number IS DISTINCT FROM OLD.delivery_note_number) THEN RAISE EXCEPTION 'Issued document numbers cannot be changed'; END IF;
  IF OLD.sale_id IS NOT NULL AND (to_jsonb(NEW)-'updated_at') IS DISTINCT FROM (to_jsonb(OLD)-'updated_at') THEN RAISE EXCEPTION 'A linked clearance cannot be changed'; END IF;
  IF NEW.sale_id IS DISTINCT FROM OLD.sale_id THEN
   IF NOT public.can_admin_store_dispatch() THEN RAISE EXCEPTION 'Only administrators may attach sales'; END IF;
   IF NEW.sale_id IS NULL THEN RAISE EXCEPTION 'An attached sale cannot be removed'; END IF;
   NEW.sale_attached_by:=auth.uid(); NEW.sale_attached_at:=now();
  ELSE NEW.sale_attached_by:=OLD.sale_attached_by; NEW.sale_attached_at:=OLD.sale_attached_at; END IF;
 END IF;
 IF NEW.delivery_note_number IS NOT NULL THEN
  IF nullif(btrim(NEW.destination_buyer),'') IS NULL OR nullif(btrim(NEW.vehicle_registration),'') IS NULL THEN RAISE EXCEPTION 'Buyer and vehicle are required'; END IF;
  IF jsonb_typeof(NEW.items)<>'array' OR jsonb_array_length(NEW.items)=0 THEN RAISE EXCEPTION 'Add at least one coffee line'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.items) i WHERE nullif(btrim(i->>'coffee_type'),'') IS NULL OR coalesce((i->>'weight_kg')::numeric,0)<=0 OR coalesce((i->>'bags')::numeric,0)<0) THEN RAISE EXCEPTION 'Each coffee line needs a type, positive weight and non-negative bags'; END IF;
  SELECT sum((i->>'weight_kg')::numeric),sum(coalesce((i->>'bags')::numeric,0)) INTO NEW.total_weight_kg,NEW.total_bags FROM jsonb_array_elements(NEW.items) i;
 END IF;
 RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.submit_legacy_store_clearance(p jsonb)
 RETURNS public.store_clearance_forms
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_row public.store_clearance_forms; v_items jsonb:='[]'; v_item jsonb;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 IF NOT (public.can_admin_store_dispatch() OR EXISTS(
   SELECT 1 FROM public.employees e WHERE lower(e.email)=lower(public.current_user_email())
     AND coalesce(e.disabled,false)=false
     AND EXISTS(SELECT 1 FROM unnest(e.permissions) x WHERE x ILIKE '%eudr%' OR x ILIKE '%store%'))) THEN
   RAISE EXCEPTION 'You do not have permission to record old clearance forms';
 END IF;
 IF EXISTS(SELECT 1 FROM public.store_clearance_forms WHERE lower(btrim(form_number))=lower(btrim(p->>'form_number'))) THEN
   RAISE EXCEPTION 'A clearance form with this number already exists';
 END IF;
 IF (p->>'clearance_date')::date > current_date THEN RAISE EXCEPTION 'Clearance date cannot be in the future'; END IF;
 FOR v_item IN SELECT value FROM jsonb_array_elements(coalesce(p->'items','[]')) LOOP
   v_items:=v_items||jsonb_build_array(jsonb_build_object(
     'lot_ref',nullif(btrim(v_item->>'lot_ref'),''),'coffee_type',btrim(v_item->>'coffee_type'),
     'bags',coalesce(nullif(v_item->>'bags','')::numeric,0),'weight_kg',coalesce(nullif(v_item->>'weight_kg','')::numeric,0)));
 END LOOP;
 PERFORM set_config('app.legacy_clearance','on',true);
 INSERT INTO public.store_clearance_forms(form_number,clearance_date,warehouse,destination_buyer,vehicle_registration,driver_name,driver_phone,coffee_type,items,total_bags,total_weight_kg,remarks,released_by,received_by_driver,approved_by)
 VALUES (btrim(p->>'form_number'),(p->>'clearance_date')::date,nullif(p->>'warehouse',''),nullif(p->>'destination_buyer',''),nullif(p->>'vehicle_registration',''),nullif(p->>'driver_name',''),nullif(p->>'driver_phone',''),coalesce(nullif(p->>'coffee_type',''),v_items->0->>'coffee_type'),v_items,0,0,
   concat_ws(' ', nullif(p->>'remarks',''), '[Old paper form recorded after the fact; stock not deducted]'),nullif(p->>'released_by',''),nullif(p->>'received_by_driver',''),nullif(p->>'approved_by',''))
 RETURNING * INTO v_row;
 PERFORM set_config('app.legacy_clearance','off',true);
 RETURN v_row;
END $function$;
REVOKE ALL ON FUNCTION public.submit_legacy_store_clearance(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_legacy_store_clearance(jsonb) TO authenticated;