CREATE OR REPLACE FUNCTION public.auto_migrate_to_finance_ins()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  coffee_rec RECORD;
  v_price numeric;
BEGIN
  IF NEW.status = 'approved' THEN
    SELECT * INTO coffee_rec FROM public.coffee_records WHERE id = NEW.store_record_id;
    IF coffee_rec.id IS NULL THEN
      RETURN NEW;
    END IF;
    v_price := COALESCE(NULLIF(NEW.final_price, 0), NULLIF(NEW.suggested_price, 0), 0);
    IF v_price <= 0 THEN
      RETURN NEW;
    END IF;

    UPDATE public.coffee_records SET status = 'inventory', updated_at = now() WHERE id = NEW.store_record_id;

    INSERT INTO public.finance_coffee_lots (
      quality_assessment_id, coffee_record_id, supplier_id, assessed_by, assessed_at,
      quality_json, unit_price_ugx, quantity_kg, finance_status, batch_number
    ) VALUES (
      NEW.id, NEW.store_record_id, coffee_rec.supplier_id, NEW.assessed_by,
      COALESCE(NEW.qm_reviewed_at, NEW.updated_at, now()),
      jsonb_build_object(
        'moisture', NEW.moisture, 'group1_defects', NEW.group1_defects, 'group2_defects', NEW.group2_defects,
        'below12', NEW.below12, 'pods', NEW.pods, 'husks', NEW.husks, 'stones', NEW.stones,
        'fm', NEW.fm, 'outturn', NEW.outturn, 'batch_number', NEW.batch_number, 'comments', NEW.comments
      ),
      v_price, COALESCE(coffee_rec.kilograms, 0), 'READY_FOR_FINANCE', NEW.batch_number
    )
    ON CONFLICT (quality_assessment_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS quality_to_finance_insert_trigger ON public.quality_assessments;
CREATE TRIGGER quality_to_finance_insert_trigger
AFTER INSERT ON public.quality_assessments
FOR EACH ROW EXECUTE FUNCTION public.auto_migrate_to_finance_ins();

CREATE OR REPLACE FUNCTION public.backfill_missing_finance_lots(p_from date DEFAULT NULL, p_to date DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_price numeric;
  v_count int := 0;
  v_skipped int := 0;
BEGIN
  FOR r IN
    SELECT q.*, cr.supplier_id, cr.kilograms
    FROM public.quality_assessments q
    JOIN public.coffee_records cr ON cr.id = q.store_record_id
    WHERE q.status = 'approved'
      AND (p_from IS NULL OR q.created_at::date >= p_from)
      AND (p_to IS NULL OR q.created_at::date <= p_to)
      AND NOT EXISTS (
        SELECT 1 FROM public.finance_coffee_lots f
        WHERE f.quality_assessment_id = q.id
           OR f.batch_number = q.batch_number
           OR f.coffee_record_id = q.batch_number
      )
  LOOP
    v_price := COALESCE(NULLIF(r.final_price, 0), NULLIF(r.suggested_price, 0), 0);
    IF v_price <= 0 THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    INSERT INTO public.finance_coffee_lots (
      quality_assessment_id, coffee_record_id, supplier_id, assessed_by, assessed_at,
      quality_json, unit_price_ugx, quantity_kg, finance_status, batch_number
    ) VALUES (
      r.id, r.store_record_id, r.supplier_id, r.assessed_by,
      COALESCE(r.qm_reviewed_at, r.updated_at, r.created_at),
      jsonb_build_object(
        'moisture', r.moisture, 'group1_defects', r.group1_defects, 'group2_defects', r.group2_defects,
        'below12', r.below12, 'pods', r.pods, 'husks', r.husks, 'stones', r.stones,
        'fm', r.fm, 'outturn', r.outturn, 'batch_number', r.batch_number, 'comments', r.comments,
        'backfilled', true
      ),
      v_price, COALESCE(r.kilograms, 0), 'READY_FOR_FINANCE', r.batch_number
    )
    ON CONFLICT (quality_assessment_id) DO NOTHING;

    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('created', v_count, 'skipped_no_price', v_skipped);
END;
$$;

GRANT EXECUTE ON FUNCTION public.backfill_missing_finance_lots(date, date) TO authenticated;