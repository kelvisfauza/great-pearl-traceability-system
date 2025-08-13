-- Create milling customers table
CREATE TABLE public.milling_customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  opening_balance NUMERIC NOT NULL DEFAULT 0,
  current_balance NUMERIC NOT NULL DEFAULT 0,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'Active'
);

-- Create milling transactions table
CREATE TABLE public.milling_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.milling_customers(id),
  customer_name TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  kgs_hulled NUMERIC NOT NULL,
  rate_per_kg NUMERIC NOT NULL DEFAULT 150,
  total_amount NUMERIC NOT NULL,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  balance NUMERIC NOT NULL DEFAULT 0,
  transaction_type TEXT NOT NULL DEFAULT 'hulling', -- 'hulling' or 'payment'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by TEXT NOT NULL
);

-- Create milling cash transactions table
CREATE TABLE public.milling_cash_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.milling_customers(id),
  customer_name TEXT NOT NULL,
  amount_paid NUMERIC NOT NULL,
  previous_balance NUMERIC NOT NULL,
  new_balance NUMERIC NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'Cash',
  notes TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by TEXT NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.milling_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milling_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milling_cash_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for milling_customers
CREATE POLICY "Anyone can manage milling_customers" 
ON public.milling_customers 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create policies for milling_transactions
CREATE POLICY "Anyone can manage milling_transactions" 
ON public.milling_transactions 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create policies for milling_cash_transactions
CREATE POLICY "Anyone can manage milling_cash_transactions" 
ON public.milling_cash_transactions 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_milling_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_milling_customers_updated_at
BEFORE UPDATE ON public.milling_customers
FOR EACH ROW
EXECUTE FUNCTION public.update_milling_updated_at_column();

CREATE TRIGGER update_milling_transactions_updated_at
BEFORE UPDATE ON public.milling_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_milling_updated_at_column();