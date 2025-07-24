-- Create calls table for real-time call management
CREATE TABLE public.calls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  caller_id TEXT NOT NULL,
  caller_name TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ringing' CHECK (status IN ('ringing', 'answered', 'declined', 'missed', 'ended')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

-- Create policies for call access
CREATE POLICY "Users can view calls they are involved in" 
ON public.calls 
FOR SELECT 
USING (caller_id = auth.uid()::text OR recipient_id = auth.uid()::text);

CREATE POLICY "Users can create calls they initiate" 
ON public.calls 
FOR INSERT 
WITH CHECK (caller_id = auth.uid()::text);

CREATE POLICY "Users can update calls they are involved in" 
ON public.calls 
FOR UPDATE 
USING (caller_id = auth.uid()::text OR recipient_id = auth.uid()::text);

-- Create index for performance
CREATE INDEX idx_calls_recipient_status ON public.calls(recipient_id, status);
CREATE INDEX idx_calls_caller_status ON public.calls(caller_id, status);