
-- Remove duplicate Mar 07 batch (B200-2026-03-07-ARA, keeping B007-2026-03-07-ARA)
DELETE FROM inventory_batch_sources WHERE batch_id = '72de65c7-c74f-43fe-91b2-250a4b97d0dd';
DELETE FROM inventory_batches WHERE id = '72de65c7-c74f-43fe-91b2-250a4b97d0dd';

-- Remove duplicate Mar 09 batch (B201-2026-03-09-ARA with 5041kg, keeping B008-2026-03-09-ARA with correct 5162kg)
DELETE FROM inventory_batch_sources WHERE batch_id = '84279e8e-d512-4f11-ad32-d139f6b1f242';
DELETE FROM inventory_batches WHERE id = '84279e8e-d512-4f11-ad32-d139f6b1f242';
