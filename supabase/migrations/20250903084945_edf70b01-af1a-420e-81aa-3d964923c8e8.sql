-- Clean up old verification codes with wrong phone number
DELETE FROM public.verification_codes 
WHERE email = 'nicholusscottlangz@gmail.com' 
AND phone != '+256700729340';