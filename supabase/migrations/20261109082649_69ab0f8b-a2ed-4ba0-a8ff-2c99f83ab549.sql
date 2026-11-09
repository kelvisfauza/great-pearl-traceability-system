CREATE OR REPLACE FUNCTION public.ensure_inventory_batch_source_for_record(p_coffee_record_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $function$
DECLARE
  v_record public.coffee_records%ROWTYPE;
  v_batch_id uuid;
BEGIN
  SELECT * INTO v_record FROM public.coffee_records WHERE id=p_coffee_record_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'reason','record_not_found'); END IF;
  IF v_record.status <> 'inventory' OR COALESCE(v_record.kilograms,0)<=0 THEN
    RETURN jsonb_build_object('success',true,'action','skipped_not_inventory');
  END IF;
  IF EXISTS(SELECT 1 FROM public.inventory_batch_sources WHERE coffee_record_id=v_record.id) THEN
    RETURN jsonb_build_object('success',true,'action','already_linked');
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('inventory-day:'||lower(trim(v_record.coffee_type))||':'||v_record.date::text,0));
  v_batch_id:=public.get_or_create_inventory_batch_for_day(v_record.coffee_type,v_record.date);
  INSERT INTO public.inventory_batch_sources(batch_id,coffee_record_id,kilograms,supplier_name,purchase_date)
  VALUES(v_batch_id,v_record.id,v_record.kilograms,v_record.supplier_name,v_record.date);
  UPDATE public.inventory_batches
  SET total_kilograms=COALESCE(total_kilograms,0)+v_record.kilograms,
      remaining_kilograms=COALESCE(remaining_kilograms,0)+v_record.kilograms,
      status='active',updated_at=now()
  WHERE id=v_batch_id;
  RETURN jsonb_build_object('success',true,'action','linked','batch_id',v_batch_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.discretion_buy_to_finance()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $function$
DECLARE
  coffee_rec public.coffee_records%ROWTYPE;
  finance_rec public.finance_coffee_lots%ROWTYPE;
  v_price numeric;
  v_result jsonb;
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
  v_result:=public.ensure_inventory_batch_source_for_record(coffee_rec.id);
  IF v_result->>'action' NOT IN ('linked','already_linked') OR (v_result->>'success')::boolean IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Could not link discretion purchase to stock: %',v_result;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_discretion_buy_to_finance_insert AFTER INSERT ON public.quality_assessments
FOR EACH ROW EXECUTE FUNCTION public.discretion_buy_to_finance();
REVOKE ALL ON FUNCTION public.discretion_buy_to_finance() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.discretion_buy_to_finance() TO service_role;
