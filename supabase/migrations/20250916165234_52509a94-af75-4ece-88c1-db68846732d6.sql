-- Clean up all existing policies and recreate properly
DROP POLICY IF EXISTS "Enable read access for all users" ON public.sms_logs;
DROP POLICY IF EXISTS "Enable insert for service role" ON public.sms_logs;
DROP POLICY IF EXISTS "Enable update for service role" ON public.sms_logs;
DROP POLICY IF EXISTS "Anyone can view SMS logs" ON public.sms_logs;
DROP POLICY IF EXISTS "Anyone can insert SMS logs" ON public.sms_logs;
DROP POLICY IF EXISTS "Anyone can update SMS logs" ON public.sms_logs;

-- Grant explicit permissions
GRANT ALL ON public.sms_logs TO postgres;
GRANT ALL ON public.sms_logs TO anon;
GRANT ALL ON public.sms_logs TO authenticated;
GRANT ALL ON public.sms_logs TO service_role;

-- Create working policies
CREATE POLICY "sms_logs_select_policy" ON public.sms_logs FOR SELECT USING (true);
CREATE POLICY "sms_logs_insert_policy" ON public.sms_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "sms_logs_update_policy" ON public.sms_logs FOR UPDATE USING (true);