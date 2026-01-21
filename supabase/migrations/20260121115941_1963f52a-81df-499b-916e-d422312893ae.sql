-- Link all Robusta coffee records to the Robusta inventory batch
INSERT INTO public.inventory_batch_sources (batch_id, coffee_record_id, kilograms, supplier_name, purchase_date)
SELECT 
  '1ad38175-1afc-4f86-807b-6c10daf19662' as batch_id,
  id as coffee_record_id,
  kilograms,
  supplier_name,
  date as purchase_date
FROM public.coffee_records
WHERE LOWER(coffee_type) LIKE '%robusta%' 
AND status = 'inventory'
ON CONFLICT DO NOTHING;