-- Enable SMS bypass for Morjalia account to allow login without SMS verification
UPDATE employees 
SET bypass_sms_verification = true 
WHERE email = 'morjaliajadens@gmail.com';