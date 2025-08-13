-- Remove dummy/training data from milling customers
DELETE FROM public.milling_customers 
WHERE full_name IN ('Training Milling Customer A', 'Demo Mill Client B')
   OR full_name LIKE 'Training%'
   OR full_name LIKE 'Demo%'
   OR full_name LIKE 'Test%';

-- Also remove any related cash transactions for these dummy customers
DELETE FROM public.milling_cash_transactions 
WHERE customer_name IN ('Training Milling Customer A', 'Demo Mill Client B')
   OR customer_name LIKE 'Training%'
   OR customer_name LIKE 'Demo%'
   OR customer_name LIKE 'Test%';