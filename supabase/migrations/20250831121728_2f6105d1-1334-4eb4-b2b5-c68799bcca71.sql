-- Create authentication user for Denis and link to his employee record
-- First, let's create the auth user via a function call to create-user edge function

-- For now, let's create a temporary password function that Denis can use
-- We'll insert into auth.users directly (this requires admin privileges)

-- Note: This approach requires the create-user edge function we have
-- Let's create a request to generate Denis's auth account

-- Create a placeholder entry to track this need
INSERT INTO public.user_creation_requests (
  email,
  name,
  requested_by,
  status,
  employee_id
) VALUES (
  'bwambaledenis8@gmail.com',
  'bwambale denis',
  'system_admin',
  'pending',
  '3bfd4285-343d-4991-aa06-78ace1479afb'
) ON CONFLICT (email) DO NOTHING;