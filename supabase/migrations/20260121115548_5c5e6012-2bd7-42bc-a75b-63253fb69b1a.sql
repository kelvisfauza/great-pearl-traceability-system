-- Update pending Robusta records to inventory status
-- These 36 records (12,172 kg) are available stock that was never moved to inventory
UPDATE public.coffee_records 
SET status = 'inventory', updated_at = now()
WHERE LOWER(coffee_type) LIKE '%robusta%' 
AND status = 'pending';

-- Also create inventory batches for the Robusta stock
-- Generate batch code and insert into inventory_batches
INSERT INTO public.inventory_batches (
  batch_code,
  coffee_type,
  target_capacity,
  total_kilograms,
  remaining_kilograms,
  status,
  batch_date
)
SELECT 
  'ROB-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-001',
  'Robusta',
  20000,
  SUM(kilograms),
  SUM(kilograms),
  CASE WHEN SUM(kilograms) >= 20000 THEN 'active' ELSE 'filling' END,
  CURRENT_DATE
FROM public.coffee_records
WHERE LOWER(coffee_type) LIKE '%robusta%' 
AND status = 'inventory';