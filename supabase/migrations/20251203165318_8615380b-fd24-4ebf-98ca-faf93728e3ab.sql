-- Update Timothy's employee record with the correct auth_user_id
UPDATE public.employees 
SET auth_user_id = '010f057a-92e3-479d-89b2-a801ef851949',
    updated_at = now()
WHERE email = 'tatwanzire@greatpearlcoffee.com';