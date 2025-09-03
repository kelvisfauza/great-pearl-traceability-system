-- Update Kibaba's phone number to local Uganda format
UPDATE public.employees 
SET phone = '0700729340', updated_at = now() 
WHERE email = 'nicholusscottlangz@gmail.com' AND name = 'Kibaba Nicholus';