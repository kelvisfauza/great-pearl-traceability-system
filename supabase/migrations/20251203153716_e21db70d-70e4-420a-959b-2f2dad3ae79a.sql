-- Update Denis's department to Data Analysis
UPDATE public.employees 
SET department = 'Data Analysis', updated_at = now()
WHERE email = 'bwambaledenis@greatpearlcoffee.com';

-- Update Timothy's department to IT
UPDATE public.employees 
SET department = 'IT', updated_at = now()
WHERE email = 'tatwanzire@greatpearlcoffee.com';

-- Update Alex's department to EUDR Documentation  
UPDATE public.employees 
SET department = 'EUDR Documentation', updated_at = now()
WHERE email = 'tumwinealex@greatpearlcoffee.com';

-- Update Shafik's department to Quality Control
UPDATE public.employees 
SET department = 'Quality Control', updated_at = now()
WHERE email = 'bwambaletony@greatpearlcoffee.com';

-- Update Kusa's department to Administration
UPDATE public.employees 
SET department = 'Administration', updated_at = now()
WHERE email = 'fauzakusa@greatpearlcoffee.com';

-- Update Benson's department to EUDR Documentation
UPDATE public.employees 
SET department = 'EUDR Documentation', updated_at = now()
WHERE email = 'bwambalebenson@greatpearlcoffee.com';