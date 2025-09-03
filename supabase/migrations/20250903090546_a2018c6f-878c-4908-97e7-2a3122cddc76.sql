-- Create table to track failed SMS attempts for IT support
CREATE TABLE public.sms_failures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL,
  user_name TEXT,
  user_phone TEXT NOT NULL,
  verification_code TEXT NOT NULL,
  failure_reason TEXT,
  department TEXT,
  role TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sms_failures ENABLE ROW LEVEL SECURITY;

-- Create policies - IT department can view all failures
CREATE POLICY "IT can view all SMS failures" 
ON public.sms_failures 
FOR SELECT 
USING (true);

CREATE POLICY "System can insert SMS failures" 
ON public.sms_failures 
FOR INSERT 
WITH CHECK (true);