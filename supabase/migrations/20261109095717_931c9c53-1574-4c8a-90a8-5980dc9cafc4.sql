CREATE TABLE public.store_delivery_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coffee_record_id text NOT NULL UNIQUE,
  verified_kg numeric NOT NULL,
  verified_bags integer NOT NULL,
  recorded_kg numeric,
  recorded_bags integer,
  notes text,
  verified_by text NOT NULL,
  verified_by_user uuid NOT NULL,
  verified_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.store_delivery_verifications TO authenticated;
GRANT ALL ON public.store_delivery_verifications TO service_role;
ALTER TABLE public.store_delivery_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in staff can view store verifications" ON public.store_delivery_verifications FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.is_batch_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT auth.uid() IS NOT NULL AND (public.has_role(auth.uid(),'Administrator') OR public.has_role(auth.uid(),'Super Admin'))
$$;
REVOKE ALL ON FUNCTION public.is_batch_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_batch_admin() TO authenticated;

-- Stop automatic batching: linking only happens inside the admin batch routine
CREATE OR REPLACE FUNCTION public.ensure_inventory_batch_source_for_record(p_coffee_record_id text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $function$
BEGIN
  IF EXISTS(SELECT 1 FROM public.inventory_batch_sources WHERE coffee_record_id=p_coffee_record_id) THEN
    RETURN jsonb_build_object('success',true,'action','already_linked');
  END IF;
  RETURN jsonb_build_object('success',true,'action','awaiting_admin_batch');
END;
$function$;

CREATE OR REPLACE FUNCTION public.discretion_buy_to_finance()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $function$
DECLARE
  coffee_rec public.coffee_records%ROWTYPE;
  finance_rec public.finance_coffee_lots%ROWTYPE;
  v_price numeric;
BEGIN
  IF NEW.admin_discretion_buy IS NOT TRUE THEN RETURN NEW; END IF;
  IF NEW.permanently_rejected IS TRUE THEN
    RAISE EXCEPTION 'A returned supplier delivery cannot be bought at discretion';
  END IF;
  SELECT * INTO coffee_rec FROM public.coffee_records WHERE id=NEW.store_record_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Discretion purchase requires a saved supplier delivery'; END IF;
  v_price:=COALESCE(NULLIF(NEW.admin_discretion_price,0),NULLIF(NEW.final_price,0),NULLIF(NEW.suggested_price,0),0);
  IF v_price<=0 OR COALESCE(coffee_rec.kilograms,0)<=0 THEN
    RAISE EXCEPTION 'Discretion purchase requires a positive saved price and delivery weight';
  END IF;
  SELECT * INTO finance_rec FROM public.finance_coffee_lots WHERE quality_assessment_id=NEW.id FOR UPDATE;
  IF FOUND THEN
    IF finance_rec.coffee_record_id IS DISTINCT FROM coffee_rec.id OR finance_rec.quantity_kg IS DISTINCT FROM coffee_rec.kilograms OR finance_rec.unit_price_ugx<=0 THEN
      RAISE EXCEPTION 'Existing Finance lot does not match this delivery; review it before adding stock';
    END IF;
  ELSE
    INSERT INTO public.finance_coffee_lots(
      quality_assessment_id,coffee_record_id,supplier_id,assessed_by,assessed_at,
      quality_json,unit_price_ugx,quantity_kg,finance_status,batch_number,finance_notes
    ) VALUES(
      NEW.id,coffee_rec.id,coffee_rec.supplier_id,COALESCE(NEW.assessed_by,'Quality'),
      COALESCE(NEW.admin_discretion_at,NEW.updated_at,now()),
      jsonb_build_object('moisture',NEW.moisture,'group1_defects',NEW.group1_defects,
        'group2_defects',NEW.group2_defects,'pods',NEW.pods,'husks',NEW.husks,
        'outturn',NEW.outturn,'batch_number',NEW.batch_number,'comments',NEW.comments,
        'admin_discretion',true),v_price,coffee_rec.kilograms,'READY_FOR_FINANCE',NEW.batch_number,
      'Rejected lot bought at admin discretion by '||COALESCE(NEW.admin_discretion_by,'Admin')
    );
  END IF;
  UPDATE public.coffee_records SET status='inventory',discretion_bought=true,updated_at=now()
  WHERE id=coffee_rec.id AND (status IS DISTINCT FROM 'inventory' OR discretion_bought IS DISTINCT FROM true);
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.verify_store_delivery(p_coffee_record_id text, p_verified_kg numeric, p_verified_bags integer, p_notes text DEFAULT NULL)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $function$
DECLARE r public.coffee_records%ROWTYPE; v_name text;
BEGIN
  IF NOT public.is_batch_admin() THEN RAISE EXCEPTION 'Only administrators can verify Store deliveries'; END IF;
  IF COALESCE(p_verified_kg,0)<=0 OR COALESCE(p_verified_bags,0)<=0 THEN RAISE EXCEPTION 'Enter the counted weight and bags'; END IF;
  SELECT * INTO r FROM public.coffee_records WHERE id=p_coffee_record_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Delivery not found'; END IF;
  IF EXISTS(SELECT 1 FROM public.inventory_batch_sources WHERE coffee_record_id=r.id) THEN RAISE EXCEPTION 'This delivery is already in a batch'; END IF;
  SELECT COALESCE(name,email) INTO v_name FROM public.employees WHERE lower(email)=lower(public.current_user_email()) LIMIT 1;
  INSERT INTO public.store_delivery_verifications(coffee_record_id,verified_kg,verified_bags,recorded_kg,recorded_bags,notes,verified_by,verified_by_user)
  VALUES(r.id,p_verified_kg,p_verified_bags,r.kilograms,r.bags,NULLIF(trim(p_notes),''),COALESCE(v_name,public.current_user_email(),'Admin'),auth.uid())
  ON CONFLICT(coffee_record_id) DO UPDATE SET verified_kg=EXCLUDED.verified_kg,verified_bags=EXCLUDED.verified_bags,
    recorded_kg=EXCLUDED.recorded_kg,recorded_bags=EXCLUDED.recorded_bags,notes=EXCLUDED.notes,verified_by=EXCLUDED.verified_by,
    verified_by_user=EXCLUDED.verified_by_user,verified_at=now(),updated_at=now();
  RETURN jsonb_build_object('success',true,'matches',(p_verified_kg=r.kilograms AND p_verified_bags=r.bags));
END;
$function$;
REVOKE ALL ON FUNCTION public.verify_store_delivery(text,numeric,integer,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verify_store_delivery(text,numeric,integer,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_create_inventory_batch(p_record_ids text[])
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $function$
DECLARE r RECORD; v_type text; v_batch uuid; v_code text; v_total numeric:=0; v_count int:=0; v_date date;
BEGIN
  IF NOT public.is_batch_admin() THEN RAISE EXCEPTION 'Only administrators can create batches'; END IF;
  IF p_record_ids IS NULL OR array_length(p_record_ids,1) IS NULL THEN RAISE EXCEPTION 'Choose at least one delivery'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('admin-batch-create',0));
  FOR r IN SELECT cr.*, v.verified_kg, v.verified_bags FROM public.coffee_records cr
           LEFT JOIN public.store_delivery_verifications v ON v.coffee_record_id=cr.id
           WHERE cr.id = ANY(p_record_ids) FOR UPDATE OF cr LOOP
    IF r.verified_kg IS NULL THEN RAISE EXCEPTION 'Delivery % has not been verified at the Store', COALESCE(r.batch_number,r.id); END IF;
    IF r.verified_kg<>r.kilograms OR r.verified_bags<>r.bags THEN
      RAISE EXCEPTION 'Delivery % counted weight/bags differ from the Store record; correct the record or re-verify', COALESCE(r.batch_number,r.id);
    END IF;
    IF lower(r.status) NOT IN ('inventory','assessed') THEN RAISE EXCEPTION 'Delivery % has not passed Quality', COALESCE(r.batch_number,r.id); END IF;
    IF EXISTS(SELECT 1 FROM public.inventory_batch_sources WHERE coffee_record_id=r.id) THEN RAISE EXCEPTION 'Delivery % is already in a batch', COALESCE(r.batch_number,r.id); END IF;
    IF v_type IS NULL THEN v_type:=initcap(trim(r.coffee_type));
    ELSIF lower(v_type)<>lower(trim(r.coffee_type)) THEN RAISE EXCEPTION 'All deliveries in one batch must be the same coffee type'; END IF;
    v_count:=v_count+1;
  END LOOP;
  IF v_count<>array_length(p_record_ids,1) THEN RAISE EXCEPTION 'Some chosen deliveries were not found'; END IF;
  v_date:=(now() AT TIME ZONE 'Africa/Kampala')::date;
  v_code:='B'||lpad(nextval('public.inventory_batch_code_seq')::text,3,'0')||'-'||v_date::text||'-'||upper(left(v_type,3));
  INSERT INTO public.inventory_batches(batch_code,coffee_type,batch_date,total_kilograms,remaining_kilograms,status)
  VALUES(v_code,v_type,v_date,0,0,'active') RETURNING id INTO v_batch;
  INSERT INTO public.inventory_batch_sources(batch_id,coffee_record_id,kilograms,supplier_name,purchase_date)
  SELECT v_batch,cr.id,cr.kilograms,cr.supplier_name,cr.date FROM public.coffee_records cr WHERE cr.id=ANY(p_record_ids);
  SELECT COALESCE(sum(kilograms),0) INTO v_total FROM public.coffee_records WHERE id=ANY(p_record_ids);
  UPDATE public.inventory_batches SET total_kilograms=v_total,remaining_kilograms=v_total,updated_at=now() WHERE id=v_batch;
  UPDATE public.coffee_records SET status='inventory',updated_at=now() WHERE id=ANY(p_record_ids) AND status<>'inventory';
  INSERT INTO public.audit_logs(action,table_name,record_id,performed_by,reason,record_data)
  VALUES('batch_created','inventory_batches',v_batch::text,COALESCE(public.current_user_email(),'admin'),'Admin-created batch',
    jsonb_build_object('batch_code',v_code,'deliveries',p_record_ids,'kilograms',v_total));
  RETURN jsonb_build_object('success',true,'batch_id',v_batch,'batch_code',v_code,'kilograms',v_total,'deliveries',v_count);
END;
$function$;
REVOKE ALL ON FUNCTION public.admin_create_inventory_batch(text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_create_inventory_batch(text[]) TO authenticated;