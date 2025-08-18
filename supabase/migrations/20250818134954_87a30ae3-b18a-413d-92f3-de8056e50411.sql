-- Create user accounts for Denis and Timothy
INSERT INTO user_accounts (user_id, current_balance, total_earned, total_withdrawn, salary_approved)
VALUES 
('6ddd2d12-b448-4555-af3f-bfa4438a8733', 0, 0, 0, 0),
('e5c7b8bc-1f27-4c0f-a750-c6f4e8b4a641', 0, 0, 0, 0)
ON CONFLICT (user_id) DO NOTHING;