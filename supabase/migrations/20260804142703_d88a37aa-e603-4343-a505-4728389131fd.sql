CREATE OR REPLACE FUNCTION public.auto_migrate_to_finance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  coffee_rec RECORD;
  v_price numeric;
BEGIN
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    SELECT * INTO coffee_rec
    FROM public.coffee_records
    WHERE id = NEW.store_record_id;

    IF coffee_rec.id IS NULL THEN
      RAISE EXCEPTION 'Coffee record % was not found for approved assessment %', NEW.store_record_id, NEW.id;
    END IF;

    v_price := COALESCE(NULLIF(NEW.final_price, 0), NULLIF(NEW.suggested_price, 0), 0);
    IF v_price <= 0 THEN
      RAISE EXCEPTION 'Approved assessment % must have a positive final price', NEW.id;
    END IF;

    UPDATE public.coffee_records
    SET status = 'inventory', updated_at = now()
    WHERE id = NEW.store_record_id;

    INSERT INTO public.finance_coffee_lots (
      quality_assessment_id,
      coffee_record_id,
      supplier_id,
      assessed_by,
      assessed_at,
      quality_json,
      unit_price_ugx,
      quantity_kg,
      finance_status,
      batch_number
    ) VALUES (
      NEW.id,
      NEW.store_record_id,
      coffee_rec.supplier_id,
      NEW.assessed_by,
      COALESCE(NEW.qm_reviewed_at, NEW.updated_at, now()),
      jsonb_build_object(
        'moisture', NEW.moisture,
        'group1_defects', NEW.group1_defects,
        'group2_defects', NEW.group2_defects,
        'below12', NEW.below12,
        'pods', NEW.pods,
        'husks', NEW.husks,
        'stones', NEW.stones,
        'fm', NEW.fm,
        'outturn', NEW.outturn,
        'batch_number', NEW.batch_number,
        'comments', NEW.comments,
        'quality_manager_action', NEW.qm_action,
        'quality_manager_reviewed_by', NEW.qm_reviewed_by
      ),
      v_price,
      COALESCE(coffee_rec.kilograms, 0),
      'READY_FOR_FINANCE',
      NEW.batch_number
    )
    ON CONFLICT (quality_assessment_id) DO UPDATE
    SET unit_price_ugx = EXCLUDED.unit_price_ugx,
        quantity_kg = EXCLUDED.quantity_kg,
        quality_json = EXCLUDED.quality_json,
        batch_number = EXCLUDED.batch_number,
        updated_at = now();
  END IF;

  RETURN NEW;
END;
$function$;