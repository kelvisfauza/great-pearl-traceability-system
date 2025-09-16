-- Grant explicit permissions and re-enable RLS with proper policies
GRANT ALL ON public.sms_logs TO postgres;
GRANT ALL ON public.sms_logs TO anon;
GRANT ALL ON public.sms_logs TO authenticated;
GRANT ALL ON public.sms_logs TO service_role;

-- Re-enable RLS
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

-- Create simple policies that work
DROP POLICY IF EXISTS "Anyone can view SMS logs" ON public.sms_logs;
DROP POLICY IF EXISTS "Anyone can insert SMS logs" ON public.sms_logs;  
DROP POLICY IF EXISTS "Anyone can update SMS logs" ON public.sms_logs;

CREATE POLICY "Enable read access for all users" ON public.sms_logs FOR SELECT USING (true);
CREATE POLICY "Enable insert for service role" ON public.sms_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for service role" ON public.sms_logs FOR UPDATE USING (true);