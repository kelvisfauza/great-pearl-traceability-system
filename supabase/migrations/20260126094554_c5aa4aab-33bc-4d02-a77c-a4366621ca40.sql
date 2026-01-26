-- Update Timothy's email to the correct one
UPDATE public.employee_salary_advances 
SET employee_email = 'tatwanzire@greatpearlcoffee.com',
    employee_name = 'Artwanzire Timothy'
WHERE employee_email = 'timothy@kajongoespresso.com';