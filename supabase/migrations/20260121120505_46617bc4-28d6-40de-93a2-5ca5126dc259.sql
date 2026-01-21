-- Update all existing batches to use 5,000kg target capacity
UPDATE public.inventory_batches
SET target_capacity = 5000;

-- Update status for batches that now exceed capacity
UPDATE public.inventory_batches
SET status = 'active'
WHERE total_kilograms >= 5000 AND status = 'filling';