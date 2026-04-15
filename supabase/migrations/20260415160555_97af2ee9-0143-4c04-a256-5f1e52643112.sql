INSERT INTO finance_coffee_lots (
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
  '4c5897d7-8055-4e1d-9fbe-ec0f133e064a',
  'CR-1776074316264',
  'b2715e51-d347-47c4-bc48-467f18e701bb',
  'Morjalia Jadens',
  now(),
  '{"moisture_content": 15.7, "group1_percentage": 6.8, "group2_percentage": 24.5, "pods_percentage": 1.9, "husks_percentage": 4.9, "fm_percentage": 8.1, "outturn_percentage": 71.3, "comments": "QUALITY REJECTED - Rejected: Foreign Matter above tolerance by 2.1%"}'::jsonb,
  15650,
  1286,
  'READY_FOR_FINANCE',
  '20260409024'
);