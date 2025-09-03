-- Update Kelvis Fauza's phone number
UPDATE public.employees 
SET phone = '+256752724165',
    updated_at = now()
WHERE email = 'kelvifauza@gmail.com';