-- Update Kibaba's phone number
UPDATE public.employees 
SET phone = '+256700729340', updated_at = now() 
WHERE email = 'nicholusscottlangz@gmail.com' AND name = 'Kibaba Nicholus';