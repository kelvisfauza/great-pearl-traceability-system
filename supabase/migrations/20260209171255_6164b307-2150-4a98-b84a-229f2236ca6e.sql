
-- Robusta was already zeroed out by the previous partial migration (steps 1-2 ran).
-- ROB-B005 was already created with 2,929 kg.
-- Now just create the Arabica batch and zero out Mixed.

-- Create Arabica batch with actual store stock
INSERT INTO inventory_batches (batch_code, coffee_type, total_kilograms, remaining_kilograms, status, batch_date, target_capacity)
VALUES ('ARA-B145', 'Arabica', 6448, 6448, 'active', CURRENT_DATE, 5000);

-- Mark Mixed batch as sold_out
UPDATE inventory_batches 
SET remaining_kilograms = 0, status = 'sold_out', sold_out_at = now()
WHERE LOWER(coffee_type) = 'mixed' AND remaining_kilograms > 0;
