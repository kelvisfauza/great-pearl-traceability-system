-- Create user sessions table to track active sessions
CREATE TABLE public.user_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  device_info TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_activity TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable Row Level Security
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for user sessions
CREATE POLICY "Users can view their own sessions" 
ON public.user_sessions 
FOR SELECT 
USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own sessions" 
ON public.user_sessions 
FOR INSERT 
WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own sessions" 
ON public.user_sessions 
FOR UPDATE 
USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete their own sessions" 
ON public.user_sessions 
FOR DELETE 
USING (auth.uid()::text = user_id::text);

-- Create function to update last activity
CREATE OR REPLACE FUNCTION public.update_session_activity()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_activity = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic activity updates
CREATE TRIGGER update_user_sessions_activity
BEFORE UPDATE ON public.user_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_session_activity();

-- Create function to cleanup inactive sessions
CREATE OR REPLACE FUNCTION public.cleanup_inactive_sessions()
RETURNS void AS $$
BEGIN
  -- Mark sessions as inactive if no activity for 24 hours
  UPDATE public.user_sessions 
  SET is_active = false 
  WHERE last_activity < now() - INTERVAL '24 hours' 
  AND is_active = true;
  
  -- Delete old inactive sessions (older than 7 days)
  DELETE FROM public.user_sessions 
  WHERE created_at < now() - INTERVAL '7 days' 
  AND is_active = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to invalidate other sessions when new session starts
CREATE OR REPLACE FUNCTION public.invalidate_other_sessions(p_user_id UUID, p_current_session_token TEXT)
RETURNS void AS $$
BEGIN
  -- Mark all other sessions for this user as inactive
  UPDATE public.user_sessions 
  SET is_active = false 
  WHERE user_id = p_user_id 
  AND session_token != p_current_session_token 
  AND is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;