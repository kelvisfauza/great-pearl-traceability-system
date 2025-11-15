-- Update Wyclif's salary to 250,000 UGX
UPDATE employees 
SET 
  salary = 250000,
  updated_at = now()
WHERE email = 'wyclifmusema22@gmail.com';
