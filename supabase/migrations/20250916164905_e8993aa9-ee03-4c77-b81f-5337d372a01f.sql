-- Fix SMS logs policies to allow system inserts
DROP POLICY IF EXISTS "IT can view all SMS logs" ON public.sms_logs;
DROP POLICY IF EXISTS "System can insert SMS logs" ON public.sms_logs;
DROP POLICY IF EXISTS "System can update SMS logs" ON public.sms_logs;

-- Create new policies with proper permissions
CREATE POLICY "Anyone can view SMS logs"
ON public.sms_logs
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert SMS logs"
ON public.sms_logs
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update SMS logs"
ON public.sms_logs
FOR UPDATE 
USING (true);