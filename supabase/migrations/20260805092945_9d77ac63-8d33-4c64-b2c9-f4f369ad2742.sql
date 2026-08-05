INSERT INTO public.finance_coffee_lots (
  quality_assessment_id, coffee_record_id, supplier_id, assessed_by, assessed_at,
  quality_json, unit_price_ugx, quantity_kg, finance_status, batch_number,
  amount_paid_ugx, advance_recovered_ugx, payment_status
)
SELECT
  qa.id,
  cr.id,
  (SELECT s.id FROM public.suppliers s WHERE s.name = cr.supplier_name LIMIT 1),
  COALESCE(qa.assessed_by, 'system'),
  COALESCE(qa.admin_discretion_at, qa.created_at, now()),
  jsonb_build_object(
    'backfilled', true,
    'admin_discretion', true,
    'batch_number', qa.batch_number,
    'moisture', qa.moisture,
    'fm', qa.fm,
    'outturn', qa.outturn,
    'notes', qa.admin_discretion_notes
  ),
  qa.admin_discretion_price,
  cr.kilograms,
  'READY_FOR_FINANCE'::lot_finance_status,
  qa.batch_number,
  0, 0,
  'UNPAID'
FROM public.quality_assessments qa
JOIN public.coffee_records cr ON cr.id = qa.store_record_id
LEFT JOIN public.finance_coffee_lots f ON f.coffee_record_id = cr.id
WHERE qa.admin_discretion_buy = true
  AND f.id IS NULL
  AND COALESCE(qa.admin_discretion_price, 0) > 0
  AND COALESCE(cr.kilograms, 0) > 0
  AND COALESCE(cr.status, '') <> 'paid';