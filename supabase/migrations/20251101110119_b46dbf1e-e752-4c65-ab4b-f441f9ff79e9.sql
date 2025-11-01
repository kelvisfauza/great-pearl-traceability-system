-- Update Fauza's salary to 300,000
UPDATE employees 
SET salary = 300000 
WHERE LOWER(name) LIKE '%fauza%';
