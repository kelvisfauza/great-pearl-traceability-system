-- Fix Benson's fully-paid advance (balance = 0 but still 'active')
UPDATE employee_salary_advances 
SET status = 'paid_off', updated_at = NOW() 
WHERE id = '6b4fec4a-657a-4e89-a661-ee9c4782a3be' 
AND remaining_balance = 0;