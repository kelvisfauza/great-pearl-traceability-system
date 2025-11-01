-- Update employee salaries for specific users
UPDATE employees 
SET salary = CASE 
  WHEN LOWER(name) LIKE '%denis%' AND LOWER(name) LIKE '%bwambale%' THEN 300000
  WHEN LOWER(name) LIKE '%timothy%' AND LOWER(name) LIKE '%artwanzire%' THEN 250000
  WHEN LOWER(name) LIKE '%shafik%' OR LOWER(name) LIKE '%shafic%' THEN 200000
  WHEN LOWER(name) LIKE '%alex%' THEN 200000
  WHEN LOWER(name) LIKE '%benson%' THEN 200000
  ELSE salary
END
WHERE (LOWER(name) LIKE '%denis%' AND LOWER(name) LIKE '%bwambale%')
   OR (LOWER(name) LIKE '%timothy%' AND LOWER(name) LIKE '%artwanzire%')
   OR LOWER(name) LIKE '%shafik%' 
   OR LOWER(name) LIKE '%shafic%'
   OR LOWER(name) LIKE '%alex%' 
   OR LOWER(name) LIKE '%benson%';
