INSERT INTO public.finance_coffee_lots (
  quality_assessment_id, coffee_record_id, supplier_id, assessed_by, assessed_at,
  quality_json, unit_price_ugx, quantity_kg, batch_number, finance_status
)
SELECT
  qa.id,
  qa.store_record_id,
  cr.supplier_id,
  qa.assessed_by,
  COALESCE(qa.updated_at, qa.created_at),
  jsonb_build_object(
    'moisture_content', qa.moisture,
    'group1_percentage', qa.group1_defects,
    'group2_percentage', qa.group2_defects,
    'pods_percentage', qa.pods,
    'husks_percentage', qa.husks,
    'fm_percentage', qa.fm,
    'outturn_percentage', qa.outturn,
    'comments', qa.comments
  ),
  qa.final_price,
  cr.kilograms,
  qa.batch_number,
  'READY_FOR_FINANCE'
FROM public.quality_assessments qa
JOIN public.coffee_records cr ON cr.id = qa.store_record_id
LEFT JOIN public.finance_coffee_lots fcl ON fcl.quality_assessment_id = qa.id
WHERE qa.status = 'approved'
  AND fcl.id IS NULL
  AND qa.final_price > 0
  AND cr.supplier_id IS NOT NULL
ON CONFLICT (quality_assessment_id) DO NOTHING;