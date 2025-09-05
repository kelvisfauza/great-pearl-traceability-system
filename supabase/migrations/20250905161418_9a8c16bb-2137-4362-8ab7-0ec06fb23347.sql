-- Create customers table for sales & marketing
CREATE TABLE public.customers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  country text NOT NULL,
  email text NOT NULL,
  phone text,
  status text NOT NULL DEFAULT 'Active',
  total_orders integer DEFAULT 0,
  total_value numeric DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create sales_contracts table
CREATE TABLE public.sales_contracts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name text NOT NULL,
  quantity text NOT NULL,
  price numeric NOT NULL,
  delivery_date date NOT NULL,
  contract_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'Draft',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on customers table
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Enable RLS on sales_contracts table  
ALTER TABLE public.sales_contracts ENABLE ROW LEVEL SECURITY;

-- Create policies for customers table
CREATE POLICY "Anyone can manage customers" 
ON public.customers 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create policies for sales_contracts table
CREATE POLICY "Anyone can manage sales_contracts" 
ON public.sales_contracts 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Add triggers for updated_at
CREATE TRIGGER update_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sales_contracts_updated_at
BEFORE UPDATE ON public.sales_contracts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();