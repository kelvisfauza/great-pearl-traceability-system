DELETE FROM inventory_batch_sources WHERE batch_id IN (SELECT id FROM inventory_batches WHERE LOWER(coffee_type) = 'mixed');
DELETE FROM inventory_batch_sales WHERE batch_id IN (SELECT id FROM inventory_batches WHERE LOWER(coffee_type) = 'mixed');
DELETE FROM inventory_batches WHERE LOWER(coffee_type) = 'mixed';