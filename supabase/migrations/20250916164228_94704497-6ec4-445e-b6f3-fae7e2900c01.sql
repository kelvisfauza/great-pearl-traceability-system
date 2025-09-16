-- Create SMS logs table to track all SMS messages sent by the system
CREATE TABLE public.sms_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    recipient_phone TEXT NOT NULL,
    recipient_name TEXT,
    recipient_email TEXT,
    message_content TEXT NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'general',
    status TEXT NOT NULL DEFAULT 'sent', -- 'sent', 'delivered', 'failed'
    provider TEXT DEFAULT 'YoolaSMS',
    provider_response JSONB,
    credits_used INTEGER DEFAULT 1,
    failure_reason TEXT,
    department TEXT,
    triggered_by TEXT, -- What action triggered this SMS
    request_id TEXT, -- Link to approval request, expense, etc.
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for SMS logs
CREATE POLICY "IT can view all SMS logs"
ON public.sms_logs
FOR SELECT 
USING (true);

CREATE POLICY "System can insert SMS logs"
ON public.sms_logs
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update SMS logs"
ON public.sms_logs
FOR UPDATE 
USING (true);

-- Create index for better performance
CREATE INDEX idx_sms_logs_created_at ON public.sms_logs (created_at DESC);
CREATE INDEX idx_sms_logs_status ON public.sms_logs (status);
CREATE INDEX idx_sms_logs_recipient_phone ON public.sms_logs (recipient_phone);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_sms_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_sms_logs_updated_at
BEFORE UPDATE ON public.sms_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_sms_logs_updated_at();