-- Create system_errors table for IT department error tracking
CREATE TABLE public.system_errors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  error_type TEXT NOT NULL CHECK (error_type IN ('database', 'network', 'authentication', 'permission', 'workflow', 'validation', 'system')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  component TEXT NOT NULL,
  stack_trace TEXT,
  user_agent TEXT,
  user_id TEXT,
  user_email TEXT,
  url TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved')),
  recommendation TEXT,
  resolved_by TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create system_console_logs table for console log capture
CREATE TABLE public.system_console_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  level TEXT NOT NULL CHECK (level IN ('log', 'warn', 'error', 'info', 'debug')),
  message TEXT NOT NULL,
  source TEXT,
  user_id TEXT,
  user_name TEXT,
  user_department TEXT,
  url TEXT,
  user_agent TEXT,
  stack_trace TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_console_logs ENABLE ROW LEVEL SECURITY;

-- Create policies - IT staff can view all, anyone can insert
CREATE POLICY "IT staff can view all errors" 
ON public.system_errors 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can report errors" 
ON public.system_errors 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "IT staff can update errors" 
ON public.system_errors 
FOR UPDATE 
USING (true);

CREATE POLICY "IT staff can view all console logs" 
ON public.system_console_logs 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can log console messages" 
ON public.system_console_logs 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "IT staff can delete old logs" 
ON public.system_console_logs 
FOR DELETE 
USING (true);

-- Create indexes for performance
CREATE INDEX idx_system_errors_status ON public.system_errors(status);
CREATE INDEX idx_system_errors_severity ON public.system_errors(severity);
CREATE INDEX idx_system_errors_created_at ON public.system_errors(created_at DESC);
CREATE INDEX idx_system_console_logs_level ON public.system_console_logs(level);
CREATE INDEX idx_system_console_logs_created_at ON public.system_console_logs(created_at DESC);

-- Create trigger for updated_at
CREATE TRIGGER update_system_errors_updated_at
BEFORE UPDATE ON public.system_errors
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();