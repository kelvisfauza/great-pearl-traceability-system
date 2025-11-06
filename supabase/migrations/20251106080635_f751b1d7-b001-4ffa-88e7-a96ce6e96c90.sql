-- Create risk_assessments table to store historical assessments
CREATE TABLE IF NOT EXISTS public.risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  generated_by_user_id UUID REFERENCES auth.users(id),
  generated_by_name TEXT NOT NULL,
  generated_by_role TEXT,
  assessment_content TEXT NOT NULL,
  data_summary JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.risk_assessments ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view all assessments
CREATE POLICY "Users can view all risk assessments"
ON public.risk_assessments
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert their own assessments
CREATE POLICY "Users can create risk assessments"
ON public.risk_assessments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = generated_by_user_id);

-- Create index for faster queries
CREATE INDEX idx_risk_assessments_generated_at ON public.risk_assessments(generated_at DESC);
CREATE INDEX idx_risk_assessments_user_id ON public.risk_assessments(generated_by_user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_risk_assessments_updated_at
  BEFORE UPDATE ON public.risk_assessments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();