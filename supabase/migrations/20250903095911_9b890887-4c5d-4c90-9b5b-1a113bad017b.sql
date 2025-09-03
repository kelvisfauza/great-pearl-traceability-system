-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Users can view their notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their notifications" ON public.notifications;

-- Create simpler and more permissive policies
CREATE POLICY "Anyone can view notifications" 
ON public.notifications 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update notifications" 
ON public.notifications 
FOR UPDATE 
USING (true);

CREATE POLICY "Admins can delete notifications" 
ON public.notifications 
FOR DELETE 
USING (is_current_user_admin());