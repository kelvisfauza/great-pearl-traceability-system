-- Update kelvifauza auth_user_id to match the actual Supabase auth user ID
UPDATE employees 
SET auth_user_id = '42f96d36-942d-4d63-8bd3-44f573bb1f37'
WHERE email = 'kelvifauza@gmail.com';