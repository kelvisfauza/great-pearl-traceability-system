-- Create reports table for storing generated reports
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'Ready',
  format TEXT NOT NULL DEFAULT 'PDF',
  file_size TEXT,
  downloads INTEGER NOT NULL DEFAULT 0,
  generated_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Create policies for reports access (accessible to all authenticated users)
CREATE POLICY "Users can view all reports" 
ON public.reports 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create reports" 
ON public.reports 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update reports" 
ON public.reports 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete reports" 
ON public.reports 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_reports_updated_at
BEFORE UPDATE ON public.reports
FOR EACH ROW
EXECUTE FUNCTION public.update_reports_updated_at();

-- Insert some sample reports for testing
INSERT INTO public.reports (name, type, category, format, description, status, file_size, downloads, generated_by) VALUES
('Daily Store Report - 2024-12-24', 'Daily', 'Store', 'PDF', 'Daily store operations report', 'Ready', '1.2 MB', 5, 'Store Manager'),
('Weekly Finance Summary', 'Weekly', 'Finance', 'PDF', 'Weekly financial performance report', 'Ready', '2.1 MB', 12, 'Finance Team'),
('Monthly Quality Assessment', 'Monthly', 'Quality', 'PDF', 'Monthly quality control report', 'Ready', '3.5 MB', 8, 'Quality Controller'),
('Procurement Analysis Report', 'Analysis', 'Procurement', 'PDF', 'Supplier and procurement analysis', 'Ready', '1.8 MB', 3, 'Procurement Officer'),
('Inventory Status Report', 'Status', 'Inventory', 'PDF', 'Current inventory levels and movements', 'Processing', '0.9 MB', 0, 'Inventory Manager');