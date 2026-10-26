ALTER TABLE public.store_clearance_forms ADD COLUMN delivery_note_number text, ADD COLUMN sale_id uuid REFERENCES public.sales_transactions(id) ON DELETE RESTRICT, ADD COLUMN sale_attached_by uuid, ADD COLUMN sale_attached_at timestamptz;
CREATE UNIQUE INDEX store_clearance_delivery_note_number_key ON public.store_clearance_forms(delivery_note_number) WHERE delivery_note_number IS NOT NULL;
CREATE UNIQUE INDEX store_clearance_generated_number_key ON public.store_clearance_forms(form_number) WHERE form_number LIKE 'SC-%';
CREATE SEQUENCE public.store_dispatch_document_seq;
GRANT USAGE, SELECT ON SEQUENCE public.store_dispatch_document_seq TO authenticated, service_role;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.store_clearance_forms TO authenticated;
GRANT ALL ON public.store_clearance_forms TO service_role;
ALTER TABLE public.store_clearance_forms ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.can_admin_store_dispatch() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT auth.uid() IS NOT NULL AND (public.has_role(auth.uid(),'Super Admin'::public.app_role) OR public.has_role(auth.uid(),'Administrator'::public.app_role)) AND EXISTS(SELECT 1 FROM public.employees WHERE auth_user_id=auth.uid() AND lower(status)='active' AND NOT coalesce(disabled,false)); $$;
REVOKE ALL ON FUNCTION public.can_admin_store_dispatch() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_admin_store_dispatch() TO authenticated,service_role;
DROP POLICY "Authenticated can create clearance forms" ON public.store_clearance_forms;
DROP POLICY "Authenticated can update clearance forms" ON public.store_clearance_forms;
DROP POLICY "Authenticated can view clearance forms" ON public.store_clearance_forms;
DROP POLICY "Admins can delete clearance forms" ON public.store_clearance_forms;
CREATE POLICY "Operational staff view clearance pairs" ON public.store_clearance_forms FOR SELECT TO authenticated USING(public.can_admin_store_dispatch() OR public.user_has_permission('Store Management') OR public.user_has_permission('Sales Marketing') OR public.user_has_permission('Sales & Marketing') OR public.user_has_permission('EUDR Documentation'));
CREATE POLICY "Store creates clearance pairs" ON public.store_clearance_forms FOR INSERT TO authenticated WITH CHECK(public.can_admin_store_dispatch() OR public.user_has_permission('Store Management'));
CREATE POLICY "Store edits unlinked clearances" ON public.store_clearance_forms FOR UPDATE TO authenticated USING(public.can_admin_store_dispatch() OR (sale_id IS NULL AND public.user_has_permission('Store Management'))) WITH CHECK(public.can_admin_store_dispatch() OR (sale_id IS NULL AND public.user_has_permission('Store Management')));
CREATE POLICY "Admins delete unlinked clearances" ON public.store_clearance_forms FOR DELETE TO authenticated USING(sale_id IS NULL AND public.can_admin_store_dispatch());
CREATE OR REPLACE FUNCTION public.prepare_store_dispatch_pair() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE v_seq bigint; v_year text;
BEGIN
 IF TG_OP='DELETE' THEN IF OLD.sale_id IS NOT NULL THEN RAISE EXCEPTION 'Linked delivery notes cannot be deleted'; END IF; RETURN OLD; END IF;
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
END $$;
CREATE TRIGGER prepare_store_dispatch_pair BEFORE INSERT OR UPDATE OR DELETE ON public.store_clearance_forms FOR EACH ROW EXECUTE FUNCTION public.prepare_store_dispatch_pair();
CREATE OR REPLACE FUNCTION public.attach_sale_to_delivery_note(p_clearance_id uuid,p_sale_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_form public.store_clearance_forms; v_sale public.sales_transactions;
BEGIN
 IF NOT public.can_admin_store_dispatch() THEN RETURN jsonb_build_object('ok',false,'error','Only administrators may attach sales'); END IF;
 SELECT * INTO v_form FROM public.store_clearance_forms WHERE id=p_clearance_id FOR UPDATE;
 IF NOT FOUND OR v_form.delivery_note_number IS NULL THEN RETURN jsonb_build_object('ok',false,'error','Delivery note not found'); END IF;
 IF v_form.sale_id IS NOT NULL THEN RETURN jsonb_build_object('ok',v_form.sale_id=p_sale_id,'error',CASE WHEN v_form.sale_id<>p_sale_id THEN 'This delivery note already has a sale' ELSE NULL END); END IF;
 SELECT * INTO v_sale FROM public.sales_transactions WHERE id=p_sale_id FOR UPDATE;
 IF NOT FOUND OR lower(v_sale.status) IN ('cancelled','canceled') THEN RETURN jsonb_build_object('ok',false,'error','Choose an existing non-cancelled sale'); END IF;
 UPDATE public.store_clearance_forms SET sale_id=p_sale_id WHERE id=p_clearance_id;
 RETURN jsonb_build_object('ok',true,'delivery_note_number',v_form.delivery_note_number);
END $$;
REVOKE ALL ON FUNCTION public.attach_sale_to_delivery_note(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.attach_sale_to_delivery_note(uuid,uuid) TO authenticated;