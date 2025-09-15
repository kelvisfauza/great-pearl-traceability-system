-- Revert Denis's SMS bypass - he should use normal SMS verification
UPDATE public.employees 
SET bypass_sms_verification = false 
WHERE email = 'bwambaledenis8@gmail.com';

-- Only keep bypass for Timothy who specifically requested it
UPDATE public.employees 
SET bypass_sms_verification = false 
WHERE department = 'IT Department' 
AND email != 'tatwanzire@gmail.com' 
AND status = 'Active';