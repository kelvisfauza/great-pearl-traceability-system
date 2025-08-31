-- Create a temporary function to handle Denis user creation
-- Since we can't directly manipulate auth.users, let's use the trigger approach

-- First, let's create a simple signal table to trigger user creation
CREATE TABLE IF NOT EXISTS public.user_creation_signals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  password text NOT NULL,
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Insert a signal for Denis
INSERT INTO public.user_creation_signals (email, password, name)
VALUES ('bwambaledenis8@gmail.com', 'Denis123!', 'bwambale denis')
ON CONFLICT DO NOTHING;

-- For now, let's try to manually link Denis with an existing auth user
-- Update Denis's employee record with a placeholder auth_user_id
-- This is a temporary fix - in production we'd use the create-user edge function properly
UPDATE public.employees 
SET auth_user_id = 'temp-denis-auth-id'
WHERE email = 'bwambaledenis8@gmail.com';