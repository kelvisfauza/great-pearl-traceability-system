INSERT INTO finance_coffee_lots (
  quality_assessment_id,
  coffee_record_id,
  supplier_id,
  assessed_by,
  assessed_at,
  unit_price_ugx,
  quantity_kg,
  finance_status,
  batch_number,
  quality_json
)
SELECT
  qa.id,
  qa.store_record_id,
  cr.supplier_id,
  qa.assessed_by,
  qa.date_assessed,
  qa.final_price,
  cr.kilograms,
  'READY_FOR_FINANCE',
  qa.batch_number,
  json_build_object(
    'moisture', qa.moisture,
    'group1_defects', qa.group1_defects,
    'group2_defects', qa.group2_defects,
    'outturn', qa.outturn,
    'final_price', qa.final_price
  )::jsonb
FROM quality_assessments qa
JOIN coffee_records cr ON cr.id = qa.store_record_id
WHERE qa.status = 'approved'
AND NOT EXISTS (
  SELECT 1 FROM finance_coffee_lots fcl 
  WHERE fcl.quality_assessment_id = qa.id
);