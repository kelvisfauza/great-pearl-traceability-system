-- Update Kibaba's employee email to match his auth email
UPDATE employees 
SET email = 'nickscott@greatpearlcoffee.com', 
    updated_at = now() 
WHERE email = 'nicholusscottlangz@gmail.com';

-- Also update any pending overtime awards to use the correct email
UPDATE overtime_awards
SET employee_email = 'nickscott@greatpearlcoffee.com'
WHERE employee_email = 'nicholusscottlangz@gmail.com';