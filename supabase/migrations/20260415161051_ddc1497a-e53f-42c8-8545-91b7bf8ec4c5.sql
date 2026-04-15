INSERT INTO finance_coffee_lots (quality_assessment_id, coffee_record_id, supplier_id, assessed_by, assessed_at, quality_json, unit_price_ugx, quantity_kg, finance_status, batch_number)
SELECT 
  qa.id,
  qa.store_record_id,
  cr.supplier_id,
  qa.assessed_by,
  now(),
  jsonb_build_object(
    'moisture_content', qa.moisture,
    'group1_percentage', qa.group1_defects,
    'group2_percentage', qa.group2_defects,
    'pods_percentage', qa.pods,
    'husks_percentage', qa.husks,
    'fm_percentage', qa.fm,
    'outturn_percentage', qa.outturn,
    'comments', 'QUALITY REJECTED - ' || COALESCE(qa.quality_note, qa.comments, 'Admin priced')
  ),
  qa.final_price,
  cr.kilograms,
  'READY_FOR_FINANCE',
  qa.batch_number
FROM quality_assessments qa
JOIN coffee_records cr ON cr.id = qa.store_record_id
WHERE qa.reject_final = true 
  AND qa.final_price > 0
  AND NOT EXISTS (SELECT 1 FROM finance_coffee_lots fl WHERE fl.quality_assessment_id = qa.id);