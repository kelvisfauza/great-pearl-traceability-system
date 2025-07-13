
-- Create user_profiles table to link auth users with employees
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id),
  UNIQUE(employee_id)
);

-- Enable RLS on user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for user_profiles
CREATE POLICY "Users can view their own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Create a function to get current user's employee data
CREATE OR REPLACE FUNCTION public.get_current_employee()
RETURNS TABLE(
  employee_id UUID,
  name TEXT,
  email TEXT,
  phone TEXT,
  position TEXT,
  department TEXT,
  role TEXT,
  permissions TEXT[]
)
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    e.id,
    e.name,
    e.email,
    e.phone,
    e.position,
    e.department,
    e.role,
    e.permissions
  FROM public.employees e
  JOIN public.user_profiles up ON e.id = up.employee_id
  WHERE up.user_id = auth.uid();
$$;

-- Function to automatically create user profile when employee is created with email matching auth user
CREATE OR REPLACE FUNCTION public.handle_employee_user_link()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Try to link employee to existing auth user with same email
  INSERT INTO public.user_profiles (user_id, employee_id)
  SELECT au.id, NEW.id
  FROM auth.users au
  WHERE au.email = NEW.email
  ON CONFLICT (user_id) DO NOTHING
  ON CONFLICT (employee_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically link employees to users
CREATE TRIGGER on_employee_created
  AFTER INSERT ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_employee_user_link();

-- Update conversation_participants to use auth user IDs instead of employee IDs
-- First, let's update the RLS policies to work with proper user mapping
DROP POLICY IF EXISTS "Authenticated users can view conversation participants" ON conversation_participants;
DROP POLICY IF EXISTS "Authenticated users can join conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Authenticated users can update participation" ON conversation_participants;

CREATE POLICY "Users can view their own participation records" 
  ON conversation_participants 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can join conversations" 
  ON conversation_participants 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participation" 
  ON conversation_participants 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Update message policies to work with proper user mapping
DROP POLICY IF EXISTS "Authenticated users can view messages" ON messages;
DROP POLICY IF EXISTS "Authenticated users can send messages" ON messages;
DROP POLICY IF EXISTS "Authenticated users can update messages" ON messages;

CREATE POLICY "Users can view messages in their conversations" 
  ON messages 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants 
      WHERE conversation_participants.conversation_id = messages.conversation_id 
      AND conversation_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages to their conversations" 
  ON messages 
  FOR INSERT 
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM conversation_participants 
      WHERE conversation_participants.conversation_id = messages.conversation_id 
      AND conversation_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own messages" 
  ON messages 
  FOR UPDATE 
  USING (auth.uid() = sender_id);
