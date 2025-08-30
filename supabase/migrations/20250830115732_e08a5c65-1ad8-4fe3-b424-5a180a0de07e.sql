-- Create storage bucket for report documents
INSERT INTO storage.buckets (id, name, public) VALUES ('report-documents', 'report-documents', false);

-- Create storage policies for report documents
CREATE POLICY "Users can upload report documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'report-documents');

CREATE POLICY "Users can view report documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'report-documents');

CREATE POLICY "Users can update their report documents" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'report-documents');

CREATE POLICY "Users can delete their report documents" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'report-documents');

-- Create store_reports table
CREATE TABLE public.store_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  coffee_type TEXT NOT NULL,
  kilograms_bought NUMERIC NOT NULL DEFAULT 0,
  average_buying_price NUMERIC NOT NULL DEFAULT 0,
  kilograms_sold NUMERIC NOT NULL DEFAULT 0,
  bags_sold INTEGER NOT NULL DEFAULT 0,
  sold_to TEXT,
  bags_left INTEGER NOT NULL DEFAULT 0,
  kilograms_left NUMERIC NOT NULL DEFAULT 0,
  kilograms_unbought NUMERIC NOT NULL DEFAULT 0,
  advances_given NUMERIC NOT NULL DEFAULT 0,
  comments TEXT,
  input_by TEXT NOT NULL,
  attachment_url TEXT,
  attachment_name TEXT,
  scanner_used TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.store_reports ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can insert store_reports" 
ON public.store_reports 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can view store_reports" 
ON public.store_reports 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can update store_reports" 
ON public.store_reports 
FOR UPDATE 
USING (true);

CREATE POLICY "Only admins can delete store_reports" 
ON public.store_reports 
FOR DELETE 
USING (is_current_user_admin());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_store_reports_updated_at
BEFORE UPDATE ON public.store_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();