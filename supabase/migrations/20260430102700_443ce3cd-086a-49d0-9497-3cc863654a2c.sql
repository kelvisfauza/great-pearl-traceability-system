
-- Update employee email
UPDATE public.employees
SET email = 'sserunkumataufiq@greatpearlcoffee.com',
    updated_at = now()
WHERE id = 'bdb0cc7f-6636-42e6-a8fb-a925e51d1c03';

-- Update auth.users email so OTP/login codes go to the correct address
UPDATE auth.users
SET email = 'sserunkumataufiq@greatpearlcoffee.com',
    raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('email', 'sserunkumataufiq@greatpearlcoffee.com'),
    updated_at = now()
WHERE id = '5ac019de-199c-4a3f-97de-96de786f55dc';
