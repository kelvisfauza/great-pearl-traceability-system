-- Update Kibaba's permissions to include Sales & Marketing
UPDATE public.employees 
SET permissions = permissions || ARRAY['Sales & Marketing']
WHERE email = 'nicholusscottlangz@gmail.com' 
AND NOT ('Sales & Marketing' = ANY(permissions));

-- Update Denis's permissions to include Sales & Marketing  
UPDATE public.employees 
SET permissions = permissions || ARRAY['Sales & Marketing']
WHERE email = 'bwambaledenis8@gmail.com'
AND NOT ('Sales & Marketing' = ANY(permissions));