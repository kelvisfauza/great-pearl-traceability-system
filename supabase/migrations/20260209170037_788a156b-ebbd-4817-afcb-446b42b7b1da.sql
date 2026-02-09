-- Restore ROB-B001 remaining_kilograms
UPDATE inventory_batches SET remaining_kilograms = remaining_kilograms + 5000, status = 'active', sold_out_at = NULL, updated_at = NOW() WHERE id = '6035ee71-c92e-4a9f-afff-18bfa9b37f8d';

-- Restore ROB-B002 remaining_kilograms
UPDATE inventory_batches SET remaining_kilograms = remaining_kilograms + 5000, status = 'active', sold_out_at = NULL, updated_at = NOW() WHERE id = '7d31abe4-8c4e-499b-825f-589b15e46fb8';

-- Restore ROB-B003 remaining_kilograms
UPDATE inventory_batches SET remaining_kilograms = remaining_kilograms + 5000, status = 'active', sold_out_at = NULL, updated_at = NOW() WHERE id = '80b553c0-f6a2-4ea4-8171-517c7b1f56bf';

-- Restore ROB-B004 remaining_kilograms
UPDATE inventory_batches SET remaining_kilograms = remaining_kilograms + 2333, status = 'active', sold_out_at = NULL, updated_at = NOW() WHERE id = '696c69f0-df2f-4610-b07d-378a6bbcdc99';

-- Delete the TOITON movement records
DELETE FROM inventory_movements WHERE reference_id = '3e09312c-d712-48c7-adcf-4d8e2c16e4f2';