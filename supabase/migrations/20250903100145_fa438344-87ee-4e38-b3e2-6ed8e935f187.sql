-- Drop existing policies for announcements table
DROP POLICY IF EXISTS "Only admins can create announcements" ON public.announcements;
DROP POLICY IF EXISTS "Only admins can update announcements" ON public.announcements;
DROP POLICY IF EXISTS "Only admins can delete announcements" ON public.announcements;
DROP POLICY IF EXISTS "Anyone can view announcements" ON public.announcements;

-- Create more permissive policies for announcements
CREATE POLICY "Anyone can view announcements" 
ON public.announcements 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create announcements" 
ON public.announcements 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update announcements" 
ON public.announcements 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete announcements" 
ON public.announcements 
FOR DELETE 
USING (auth.uid() IS NOT NULL);