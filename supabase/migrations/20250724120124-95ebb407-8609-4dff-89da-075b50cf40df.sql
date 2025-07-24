-- Create storage bucket for profile pictures
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Create storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create user requests table for payments, complaints, etc.
CREATE TABLE public.user_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL CHECK (request_type IN ('payment_advance', 'supplier_motivation', 'complaint', 'feedback', 'leave_request', 'expense_reimbursement')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC DEFAULT NULL,
  supplier_details JSONB DEFAULT NULL,
  priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Under Review', 'Approved', 'Rejected', 'Completed')),
  requested_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reviewed_by TEXT DEFAULT NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  response_message TEXT DEFAULT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_requests
CREATE POLICY "Users can view their own requests" 
ON public.user_requests 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own requests" 
ON public.user_requests 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending requests" 
ON public.user_requests 
FOR UPDATE 
USING (auth.uid() = user_id AND status = 'Pending');

CREATE POLICY "HR and Admin can view all requests" 
ON public.user_requests 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.employees 
    WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND (role = 'Administrator' OR permissions @> '["Human Resources"]'::jsonb)
  )
);

CREATE POLICY "HR and Admin can update all requests" 
ON public.user_requests 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.employees 
    WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND (role = 'Administrator' OR permissions @> '["Human Resources"]'::jsonb)
  )
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_user_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_requests_updated_at
BEFORE UPDATE ON public.user_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_user_requests_updated_at();