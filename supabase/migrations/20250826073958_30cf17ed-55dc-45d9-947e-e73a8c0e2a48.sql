-- Create audit_logs table for tracking actions
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  record_data JSONB,
  reason TEXT,
  performed_by TEXT NOT NULL,
  department TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can view all audit logs" 
ON public.audit_logs 
FOR SELECT 
USING (is_current_user_admin());

CREATE POLICY "Anyone can insert audit logs" 
ON public.audit_logs 
FOR INSERT 
WITH CHECK (true);

-- Index for performance
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX idx_audit_logs_performed_by ON public.audit_logs(performed_by);