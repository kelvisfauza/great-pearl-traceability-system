
-- Create daily batch for March 7 (baseline + purchases = 5,488 + 351 + 46 + 341 + 30 = 6,256 kg)
INSERT INTO inventory_batches (id, batch_code, coffee_type, batch_date, total_kilograms, remaining_kilograms, status)
VALUES 
  (gen_random_uuid(), 'B200-2026-03-07-ARA', 'Arabica', '2026-03-07', 6256, 6256, 'active')
ON CONFLICT DO NOTHING;

-- Create daily batch for March 9 (346+102+3930+105+231+297+30 = 5,041 kg)
INSERT INTO inventory_batches (id, batch_code, coffee_type, batch_date, total_kilograms, remaining_kilograms, status)
VALUES 
  (gen_random_uuid(), 'B201-2026-03-09-ARA', 'Arabica', '2026-03-09', 5041, 5041, 'active')
ON CONFLICT DO NOTHING;

-- Link March 7 records to their batch
INSERT INTO inventory_batch_sources (id, batch_id, coffee_record_id, kilograms, supplier_name, purchase_date)
SELECT gen_random_uuid(), b.id, cr.id, cr.kilograms, cr.supplier_name, cr.date
FROM coffee_records cr
CROSS JOIN inventory_batches b
WHERE b.batch_code = 'B200-2026-03-07-ARA'
  AND cr.status = 'inventory'
  AND cr.date = '2026-03-07'
  AND cr.id NOT IN (SELECT coffee_record_id FROM inventory_batch_sources WHERE coffee_record_id IS NOT NULL);

-- Link March 9 records to their batch
INSERT INTO inventory_batch_sources (id, batch_id, coffee_record_id, kilograms, supplier_name, purchase_date)
SELECT gen_random_uuid(), b.id, cr.id, cr.kilograms, cr.supplier_name, cr.date
FROM coffee_records cr
CROSS JOIN inventory_batches b
WHERE b.batch_code = 'B201-2026-03-09-ARA'
  AND cr.status = 'inventory'
  AND cr.date >= '2026-03-09'
  AND cr.id NOT IN (SELECT coffee_record_id FROM inventory_batch_sources WHERE coffee_record_id IS NOT NULL);

-- Update the old 5,488 batch to sold_out since it's been replaced
UPDATE inventory_batches 
SET status = 'sold_out', remaining_kilograms = 0 
WHERE status = 'active' 
  AND coffee_type = 'Arabica' 
  AND total_kilograms = 5488
  AND batch_code != 'B200-2026-03-07-ARA';
