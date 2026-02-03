-- Delete existing Robusta batches (only 5kg incorrectly synced)
DELETE FROM inventory_batches WHERE LOWER(coffee_type) LIKE '%robusta%';

-- Calculate available Robusta: 34,682 kg in inventory - 17,333 kg sold = 17,349 kg
-- Create proper FIFO batches for Robusta (5,000 kg each)

-- Batch 1: 5,000 kg (full)
INSERT INTO inventory_batches (batch_code, coffee_type, total_kilograms, remaining_kilograms, status, batch_date)
VALUES ('ROB-B001', 'Robusta', 5000, 5000, 'active', '2026-01-15');

-- Batch 2: 5,000 kg (full)
INSERT INTO inventory_batches (batch_code, coffee_type, total_kilograms, remaining_kilograms, status, batch_date)
VALUES ('ROB-B002', 'Robusta', 5000, 5000, 'active', '2026-01-16');

-- Batch 3: 5,000 kg (full)  
INSERT INTO inventory_batches (batch_code, coffee_type, total_kilograms, remaining_kilograms, status, batch_date)
VALUES ('ROB-B003', 'Robusta', 5000, 5000, 'active', '2026-01-17');

-- Batch 4: 2,349 kg (filling - remaining stock)
INSERT INTO inventory_batches (batch_code, coffee_type, total_kilograms, remaining_kilograms, status, batch_date)
VALUES ('ROB-B004', 'Robusta', 2349, 2349, 'filling', '2026-01-21');