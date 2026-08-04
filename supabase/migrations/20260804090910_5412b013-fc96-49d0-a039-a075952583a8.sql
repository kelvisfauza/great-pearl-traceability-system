CREATE OR REPLACE FUNCTION public.discretion_buy_to_finance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  coffee_rec RECORD;
  v_price numeric;
BEGIN
  IF NEW.admin_discretion_buy IS TRUE
     AND (OLD.admin_discretion_buy IS DISTINCT FROM TRUE) THEN

    SELECT * INTO coffee_rec FROM coffee_records WHERE id = NEW.store_record_id;
    v_price := COALESCE(NEW.admin_discretion_price, NEW.final_price, NEW.suggested_price, 0);

    INSERT INTO finance_coffee_lots (
      quality_assessment_id, coffee_record_id, supplier_id, assessed_by, assessed_at,
      quality_json, unit_price_ugx, quantity_kg, finance_status, batch_number, finance_notes
    ) VALUES (
      NEW.id, NEW.store_record_id, coffee_rec.supplier_id,
      COALESCE(NEW.assessed_by, 'Quality'), COALESCE(NEW.updated_at, now()),
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
      v_price, COALESCE(coffee_rec.kilograms, 0), 'READY_FOR_FINANCE',
      NEW.batch_number,
      'Rejected lot bought at admin discretion by ' || COALESCE(NEW.admin_discretion_by, 'Admin')
    )
    ON CONFLICT (quality_assessment_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_discretion_buy_to_finance ON public.quality_assessments;
CREATE TRIGGER trg_discretion_buy_to_finance
AFTER UPDATE ON public.quality_assessments
FOR EACH ROW EXECUTE FUNCTION public.discretion_buy_to_finance();

-- Backfill discretion-bought lots from 1 July 2026 that never reached Finance
INSERT INTO finance_coffee_lots (
  quality_assessment_id, coffee_record_id, supplier_id, assessed_by, assessed_at,
  quality_json, unit_price_ugx, quantity_kg, finance_status, batch_number, finance_notes
)
SELECT qa.id, qa.store_record_id, cr.supplier_id,
       COALESCE(qa.assessed_by, 'Quality'), COALESCE(qa.updated_at, now()),
       jsonb_build_object(
         'moisture', qa.moisture,
         'group1_defects', qa.group1_defects,
         'group2_defects', qa.group2_defects,
         'batch_number', qa.batch_number,
         'comments', qa.comments,
         'admin_discretion', true
       ),
       COALESCE(qa.admin_discretion_price, qa.final_price, qa.suggested_price, 0),
       COALESCE(cr.kilograms, 0), 'READY_FOR_FINANCE', qa.batch_number,
       'Backfilled: rejected lot bought at admin discretion'
FROM quality_assessments qa
JOIN coffee_records cr ON cr.id = qa.store_record_id
LEFT JOIN finance_coffee_lots f ON f.quality_assessment_id = qa.id
WHERE qa.admin_discretion_buy IS TRUE
  AND f.id IS NULL
  AND qa.date_assessed >= DATE '2026-07-01'
ON CONFLICT (quality_assessment_id) DO NOTHING;