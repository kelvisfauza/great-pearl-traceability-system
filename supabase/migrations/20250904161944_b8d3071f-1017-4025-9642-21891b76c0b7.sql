-- Create sales_transactions table
CREATE TABLE public.sales_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  customer TEXT NOT NULL,
  coffee_type TEXT NOT NULL,
  moisture TEXT,
  weight NUMERIC NOT NULL,
  unit_price NUMERIC NOT NULL,
  total_amount NUMERIC NOT NULL,
  truck_details TEXT NOT NULL,
  driver_details TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Completed',
  grn_file_url TEXT,
  grn_file_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sales_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view sales_transactions" ON public.sales_transactions
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert sales_transactions" ON public.sales_transactions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update sales_transactions" ON public.sales_transactions
  FOR UPDATE USING (true);

CREATE POLICY "Only admins can delete sales_transactions" ON public.sales_transactions
  FOR DELETE USING (is_current_user_admin());

-- Create updated_at trigger
CREATE TRIGGER update_sales_transactions_updated_at
  BEFORE UPDATE ON public.sales_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for sales documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('sales-documents', 'sales-documents', false);

-- Create storage policies for sales documents
CREATE POLICY "Anyone can upload sales documents" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'sales-documents');

CREATE POLICY "Anyone can view sales documents" ON storage.objects
  FOR SELECT USING (bucket_id = 'sales-documents');

CREATE POLICY "Anyone can update sales documents" ON storage.objects
  FOR UPDATE USING (bucket_id = 'sales-documents');

-- Update Kibaba's permissions to include Sales & Marketing
UPDATE public.employees 
SET 
  permissions = ARRAY['Quality Control', 'Milling', 'Reports', 'Store Management', 'Inventory', 'General Access', 'Sales & Marketing'],
  updated_at = now()
WHERE email = 'nicholusscottlangz@gmail.com';

-- Update Denis's permissions to include Sales & Marketing
UPDATE public.employees 
SET 
  permissions = array_append(permissions, 'Sales & Marketing'),
  updated_at = now()
WHERE email = 'bwambaledenis8@gmail.com';