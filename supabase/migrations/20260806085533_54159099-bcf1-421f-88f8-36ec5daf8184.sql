
CREATE OR REPLACE FUNCTION public.discretion_buy_to_finance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  coffee_rec RECORD;
  v_price numeric;
  v_qty numeric;
BEGIN
  IF NEW.admin_discretion_buy IS TRUE THEN
    -- skip if a lot already exists for this assessment/batch
    IF EXISTS (
      SELECT 1 FROM public.finance_coffee_lots f
      WHERE f.quality_assessment_id = NEW.id
         OR (NEW.batch_number IS NOT NULL AND f.batch_number = NEW.batch_number)
    ) THEN
      RETURN NEW;
    END IF;

    SELECT * INTO coffee_rec FROM public.coffee_records WHERE id = NEW.store_record_id;
    v_price := COALESCE(NULLIF(NEW.admin_discretion_price,0), NULLIF(NEW.final_price,0), NULLIF(NEW.suggested_price,0), 0);
    v_qty := COALESCE(coffee_rec.kilograms, 0);

    IF v_price <= 0 OR v_qty <= 0 THEN
      RETURN NEW; -- nothing sensible to bill finance for yet
    END IF;

    INSERT INTO public.finance_coffee_lots (
      quality_assessment_id, coffee_record_id, supplier_id, assessed_by, assessed_at,
      quality_json, unit_price_ugx, quantity_kg, finance_status, batch_number, finance_notes
    ) VALUES (
      NEW.id, NEW.store_record_id, coffee_rec.supplier_id,
      COALESCE(NEW.assessed_by, 'Quality'), COALESCE(NEW.admin_discretion_at, NEW.updated_at, now()),
      jsonb_build_object(
        'moisture', NEW.moisture,
        'group1_defects', NEW.group1_defects,
        'group2_defects', NEW.group2_defects,
        'pods', NEW.pods,
        'husks', NEW.husks,
        'outturn', NEW.outturn,
        'batch_number', NEW.batch_number,
        'comments', NEW.comments,
        'admin_discretion', true
      ),
      v_price, v_qty, 'READY_FOR_FINANCE',
      NEW.batch_number,
      'Rejected lot bought at admin discretion by ' || COALESCE(NEW.admin_discretion_by, 'Admin')
    )
    ON CONFLICT (quality_assessment_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.backfill_discretion_finance_lots()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_price numeric;
  v_created int := 0;
  v_skipped int := 0;
BEGIN
  FOR r IN
    SELECT q.*, cr.supplier_id, cr.kilograms
    FROM public.quality_assessments q
    JOIN public.coffee_records cr ON cr.id = q.store_record_id
    WHERE q.admin_discretion_buy IS TRUE
      AND NOT EXISTS (
        SELECT 1 FROM public.finance_coffee_lots f
        WHERE f.quality_assessment_id = q.id
           OR (q.batch_number IS NOT NULL AND f.batch_number = q.batch_number)
      )
  LOOP
    v_price := COALESCE(NULLIF(r.admin_discretion_price,0), NULLIF(r.final_price,0), NULLIF(r.suggested_price,0), 0);
    IF v_price <= 0 OR COALESCE(r.kilograms,0) <= 0 THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    INSERT INTO public.finance_coffee_lots (
      quality_assessment_id, coffee_record_id, supplier_id, assessed_by, assessed_at,
      quality_json, unit_price_ugx, quantity_kg, finance_status, batch_number, finance_notes
    ) VALUES (
      r.id, r.store_record_id, r.supplier_id, COALESCE(r.assessed_by,'Quality'),
      COALESCE(r.admin_discretion_at, r.updated_at, r.created_at),
      jsonb_build_object(
        'moisture', r.moisture, 'group1_defects', r.group1_defects, 'group2_defects', r.group2_defects,
        'pods', r.pods, 'husks', r.husks, 'outturn', r.outturn,
        'batch_number', r.batch_number, 'comments', r.comments,
        'admin_discretion', true, 'backfilled', true
      ),
      v_price, r.kilograms, 'READY_FOR_FINANCE', r.batch_number,
      'Rejected lot bought at admin discretion by ' || COALESCE(r.admin_discretion_by, 'Admin')
    )
    ON CONFLICT (quality_assessment_id) DO NOTHING;

    v_created := v_created + 1;
  END LOOP;

  RETURN jsonb_build_object('created', v_created, 'skipped', v_skipped);
END;
$$;

SELECT public.backfill_discretion_finance_lots();
