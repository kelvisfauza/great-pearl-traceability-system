
-- 1. Record Robusta sale to Tuiton (11,751 kg)
INSERT INTO sales_transactions (date, customer, coffee_type, moisture, weight, unit_price, total_amount, truck_details, driver_details, status)
VALUES ('2026-03-07', 'Tuiton', 'Robusta', 'N/A', 11751, 0, 0, 'N/A', 'N/A', 'Completed');

-- 2. Mark ALL Robusta batches as sold_out
UPDATE inventory_batches 
SET remaining_kilograms = 0, status = 'sold_out', sold_out_at = NOW()
WHERE coffee_type = 'Robusta' AND status != 'sold_out';

-- 3. Mark ALL Arabica batches as sold_out (reconciliation - actual stock is much less)
UPDATE inventory_batches 
SET remaining_kilograms = 0, status = 'sold_out', sold_out_at = NOW()
WHERE coffee_type = 'Arabica' AND status != 'sold_out';

-- 4. Mark Mixed and '98' batches as sold_out
UPDATE inventory_batches 
SET remaining_kilograms = 0, status = 'sold_out', sold_out_at = NOW()
WHERE coffee_type IN ('Mixed', '98') AND status != 'sold_out';

-- 5. Create fresh Arabica batch for yesterday (5,137 kg)
INSERT INTO inventory_batches (batch_code, coffee_type, batch_date, total_kilograms, remaining_kilograms, status)
VALUES ('B016-2026-03-06-ARA', 'Arabica', '2026-03-06', 5137, 5137, 'active');

-- 6. Create fresh Arabica batch for today (351 kg)
INSERT INTO inventory_batches (batch_code, coffee_type, batch_date, total_kilograms, remaining_kilograms, status)
VALUES ('B017-2026-03-07-ARA', 'Arabica', '2026-03-07', 351, 351, 'active');
