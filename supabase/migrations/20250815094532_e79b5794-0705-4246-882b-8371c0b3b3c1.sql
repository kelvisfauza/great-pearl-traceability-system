-- Create workflow_steps table for tracking workflow progress
CREATE TABLE public.workflow_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id TEXT NOT NULL,
  quality_assessment_id TEXT,
  from_department TEXT NOT NULL,
  to_department TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('submitted', 'approved', 'rejected', 'modification_requested', 'modified')),
  reason TEXT,
  comments TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_by TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create modification_requests table for tracking modification requests
CREATE TABLE public.modification_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  original_payment_id TEXT NOT NULL,
  quality_assessment_id TEXT,
  batch_number TEXT,
  requested_by TEXT NOT NULL,
  requested_by_department TEXT NOT NULL,
  target_department TEXT NOT NULL,
  reason TEXT NOT NULL,
  comments TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modification_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for workflow_steps
CREATE POLICY "Users can view workflow steps" 
ON public.workflow_steps 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create workflow steps" 
ON public.workflow_steps 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update workflow steps" 
ON public.workflow_steps 
FOR UPDATE 
USING (true);

-- Create policies for modification_requests
CREATE POLICY "Users can view modification requests" 
ON public.modification_requests 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create modification requests" 
ON public.modification_requests 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update modification requests" 
ON public.modification_requests 
FOR UPDATE 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_workflow_steps_updated_at
BEFORE UPDATE ON public.workflow_steps
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_modification_requests_updated_at
BEFORE UPDATE ON public.modification_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_workflow_steps_payment_id ON public.workflow_steps(payment_id);
CREATE INDEX idx_workflow_steps_timestamp ON public.workflow_steps(timestamp);
CREATE INDEX idx_modification_requests_original_payment_id ON public.modification_requests(original_payment_id);
CREATE INDEX idx_modification_requests_target_department ON public.modification_requests(target_department);
CREATE INDEX idx_modification_requests_status ON public.modification_requests(status);