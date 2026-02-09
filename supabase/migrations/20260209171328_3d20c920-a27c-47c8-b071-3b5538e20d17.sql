
-- Zero out old Robusta batches
UPDATE inventory_batches 
SET remaining_kilograms = 0, status = 'sold_out', sold_out_at = now()
WHERE id IN (
  '6035ee71-c92e-4a9f-afff-18bfa9b37f8d',
  '7d31abe4-8c4e-499b-825f-589b15e46fb8',
  '80b553c0-f6a2-4ea4-8171-517c7b1f56bf',
  '696c69f0-df2f-4610-b07d-378a6bbcdc99'
);

-- Create new Robusta batch with actual store stock
INSERT INTO inventory_batches (batch_code, coffee_type, total_kilograms, remaining_kilograms, status, batch_date, target_capacity)
VALUES ('ROB-B005', 'Robusta', 2929, 2929, 'filling', CURRENT_DATE, 5000);
