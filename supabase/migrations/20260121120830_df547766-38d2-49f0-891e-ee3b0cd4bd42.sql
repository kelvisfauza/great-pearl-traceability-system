-- First, let's create the new split batches for Arabica (11,536 kg = 3 batches: 5000, 5000, 1536)
-- Batch 1: ARA-001 (5000kg)
INSERT INTO public.inventory_batches (batch_code, coffee_type, target_capacity, total_kilograms, remaining_kilograms, status, batch_date)
VALUES ('ARA-B001', 'Arabica', 5000, 5000, 5000, 'active', '2025-11-21');

-- Batch 2: ARA-002 (5000kg)
INSERT INTO public.inventory_batches (batch_code, coffee_type, target_capacity, total_kilograms, remaining_kilograms, status, batch_date)
VALUES ('ARA-B002', 'Arabica', 5000, 5000, 5000, 'active', '2025-12-01');

-- Batch 3: ARA-003 (1536kg - filling)
INSERT INTO public.inventory_batches (batch_code, coffee_type, target_capacity, total_kilograms, remaining_kilograms, status, batch_date)
VALUES ('ARA-B003', 'Arabica', 5000, 1536, 1536, 'filling', '2025-12-15');

-- Create split batches for Robusta (12,172 kg = 3 batches: 5000, 5000, 2172)
-- Batch 1: ROB-001 (5000kg)
INSERT INTO public.inventory_batches (batch_code, coffee_type, target_capacity, total_kilograms, remaining_kilograms, status, batch_date)
VALUES ('ROB-B001', 'Robusta', 5000, 5000, 5000, 'active', '2026-01-07');

-- Batch 2: ROB-002 (5000kg)
INSERT INTO public.inventory_batches (batch_code, coffee_type, target_capacity, total_kilograms, remaining_kilograms, status, batch_date)
VALUES ('ROB-B002', 'Robusta', 5000, 5000, 5000, 'active', '2026-01-12');

-- Batch 3: ROB-003 (2172kg - filling)
INSERT INTO public.inventory_batches (batch_code, coffee_type, target_capacity, total_kilograms, remaining_kilograms, status, batch_date)
VALUES ('ROB-B003', 'Robusta', 5000, 2172, 2172, 'filling', '2026-01-19');

-- Delete the old oversized batches (we'll reassign sources to new batches)
DELETE FROM public.inventory_batch_sources WHERE batch_id IN (
  'ed653b73-adf2-4be0-a175-d46427f92a62',
  '1ad38175-1afc-4f86-807b-6c10daf19662'
);

DELETE FROM public.inventory_batches WHERE id IN (
  'ed653b73-adf2-4be0-a175-d46427f92a62',
  '1ad38175-1afc-4f86-807b-6c10daf19662'
);