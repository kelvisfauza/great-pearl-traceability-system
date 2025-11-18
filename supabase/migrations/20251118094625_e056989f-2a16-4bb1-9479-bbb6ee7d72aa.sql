-- Update Timothy's email in employees table
UPDATE public.employees 
SET 
  email = 'tatwanzire@greatpearlcoffee.com',
  updated_at = now()
WHERE email = 'tatwanzire@gmail.com';