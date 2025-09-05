-- Fix Kibaba's permission - update from "Sales & Marketing" to "Sales Marketing" to match route requirement
UPDATE public.employees 
SET permissions = ARRAY(
  SELECT CASE 
    WHEN unnest_val = 'Sales & Marketing' THEN 'Sales Marketing'
    ELSE unnest_val 
  END
  FROM unnest(permissions) AS unnest_val
)
WHERE email = 'nicholusscottlangz@gmail.com';

-- Also update Denis's permission for consistency
UPDATE public.employees 
SET permissions = ARRAY(
  SELECT CASE 
    WHEN unnest_val = 'Sales & Marketing' THEN 'Sales Marketing'
    ELSE unnest_val 
  END
  FROM unnest(permissions) AS unnest_val
)
WHERE email = 'bwambaledenis8@gmail.com';