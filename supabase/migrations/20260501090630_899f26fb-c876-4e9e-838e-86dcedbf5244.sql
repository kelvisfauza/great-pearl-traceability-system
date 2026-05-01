-- Standardize data_allowance to UGX 20,000 for the 9 approved recipients
UPDATE public.monthly_allowances
SET amount = 20000, is_active = true
WHERE allowance_type = 'data_allowance'
  AND employee_email IN (
    'musemawyclif@greatpearlcoffee.com',
    'tatwanzire@greatpearlcoffee.com',
    'godwinmukobi@greatpearlcoffee.com',
    'bwambalemorjalia@greatpearlcoffee.com',
    'johnmasereka@greatpearlcoffee.com',
    'bwambaledenis@greatpearlcoffee.com',
    'fauzakusa@greatpearlcoffee.com'
  );

-- Add missing data_allowance rows for Alex and Kibaba at 20k
INSERT INTO public.monthly_allowances (employee_email, employee_name, allowance_type, amount, is_active)
SELECT e.email, e.name, 'data_allowance', 20000, true
FROM public.employees e
WHERE e.email IN ('tumwinealex@greatpearlcoffee.com', 'nickscott@greatpearlcoffee.com')
  AND NOT EXISTS (
    SELECT 1 FROM public.monthly_allowances ma
    WHERE ma.employee_email = e.email AND ma.allowance_type = 'data_allowance'
  );

-- Deactivate any other data_allowance configs not in the approved list of 9
UPDATE public.monthly_allowances
SET is_active = false
WHERE allowance_type = 'data_allowance'
  AND employee_email NOT IN (
    'musemawyclif@greatpearlcoffee.com',
    'tatwanzire@greatpearlcoffee.com',
    'godwinmukobi@greatpearlcoffee.com',
    'bwambalemorjalia@greatpearlcoffee.com',
    'johnmasereka@greatpearlcoffee.com',
    'bwambaledenis@greatpearlcoffee.com',
    'tumwinealex@greatpearlcoffee.com',
    'nickscott@greatpearlcoffee.com',
    'fauzakusa@greatpearlcoffee.com'
  );