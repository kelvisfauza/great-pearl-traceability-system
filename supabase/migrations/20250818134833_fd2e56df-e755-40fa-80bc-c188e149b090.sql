-- Link Denis and Timothy to their Supabase Auth accounts
UPDATE employees 
SET auth_user_id = '6ddd2d12-b448-4555-af3f-bfa4438a8733' 
WHERE email = 'bwambaledenis8@gmail.com';

UPDATE employees 
SET auth_user_id = 'e5c7b8bc-1f27-4c0f-a750-c6f4e8b4a641' 
WHERE email = 'tatwanzire@gmail.com';