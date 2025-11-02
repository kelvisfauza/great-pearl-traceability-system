-- Update auth_user_id for employees that are missing it
UPDATE public.employees
SET auth_user_id = '00b188fc-73fe-4ee7-9fe9-956ab2faa6ec'
WHERE email = 'kelviskusa@gmail.com' AND auth_user_id IS NULL;