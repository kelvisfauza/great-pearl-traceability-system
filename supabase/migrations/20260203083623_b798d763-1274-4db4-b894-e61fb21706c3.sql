
-- 1. Normalize coffee_type case to title case across inventory_batches
UPDATE inventory_batches
SET coffee_type = INITCAP(LOWER(coffee_type))
WHERE coffee_type != INITCAP(LOWER(coffee_type));

-- 2. Update inventory_batch_sources.supplier_name from coffee_records and suppliers table
UPDATE inventory_batch_sources ibs
SET supplier_name = COALESCE(s.name, REGEXP_REPLACE(cr.supplier_name, '\s*\(SUP[^)]+\)', '', 'g'))
FROM coffee_records cr
LEFT JOIN suppliers s ON s.id = cr.supplier_id
WHERE ibs.coffee_record_id = cr.id
  AND (ibs.supplier_name LIKE '%(SUP%' OR s.name IS NOT NULL);

-- 3. Delete orphaned batches with no sources (these are ghost batches)
DELETE FROM inventory_batches
WHERE id IN (
  SELECT ib.id FROM inventory_batches ib
  LEFT JOIN inventory_batch_sources ibs ON ibs.batch_id = ib.id
  GROUP BY ib.id
  HAVING COUNT(ibs.id) = 0
);

-- 4. Recalculate totals for remaining batches to ensure accuracy
UPDATE inventory_batches ib
SET 
  total_kilograms = COALESCE(src.total_kg, 0),
  remaining_kilograms = COALESCE(src.total_kg, 0) - COALESCE(sales.sold_kg, 0),
  status = CASE 
    WHEN COALESCE(src.total_kg, 0) - COALESCE(sales.sold_kg, 0) <= 0 THEN 'sold_out'
    WHEN COALESCE(src.total_kg, 0) >= 5000 THEN 'active'
    ELSE 'filling'
  END
FROM (
  SELECT batch_id, SUM(kilograms) as total_kg
  FROM inventory_batch_sources
  GROUP BY batch_id
) src
LEFT JOIN (
  SELECT batch_id, SUM(kilograms_deducted) as sold_kg
  FROM inventory_batch_sales
  GROUP BY batch_id
) sales ON sales.batch_id = src.batch_id
WHERE ib.id = src.batch_id;