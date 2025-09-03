-- Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  target_user_id UUID,
  target_department TEXT,
  target_role TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their notifications" 
ON public.notifications 
FOR SELECT 
USING (
  target_user_id IS NULL OR 
  target_user_id IN (SELECT id FROM public.employees WHERE auth_user_id = auth.uid()) OR
  target_department IN (SELECT department FROM public.employees WHERE auth_user_id = auth.uid()) OR
  target_role IN (SELECT role FROM public.employees WHERE auth_user_id = auth.uid())
);

CREATE POLICY "System can create notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update their notifications" 
ON public.notifications 
FOR UPDATE 
USING (
  target_user_id IS NULL OR 
  target_user_id IN (SELECT id FROM public.employees WHERE auth_user_id = auth.uid()) OR
  target_department IN (SELECT department FROM public.employees WHERE auth_user_id = auth.uid()) OR
  target_role IN (SELECT role FROM public.employees WHERE auth_user_id = auth.uid())
);