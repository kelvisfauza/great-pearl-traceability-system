
-- Remove the sample approval requests data
DELETE FROM public.approval_requests 
WHERE title IN (
  'Coffee Bean Purchase',
  'Additional Quality Inspector', 
  'Equipment Maintenance Fund',
  'New Coffee Grinder'
);
