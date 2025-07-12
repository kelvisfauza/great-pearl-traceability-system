
-- Create suppliers table
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  phone TEXT,
  origin TEXT NOT NULL,
  opening_balance DECIMAL NOT NULL DEFAULT 0,
  date_registered DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create coffee_records table
CREATE TABLE public.coffee_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coffee_type TEXT NOT NULL,
  date DATE NOT NULL,
  kilograms DECIMAL NOT NULL,
  bags INTEGER NOT NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE,
  supplier_name TEXT NOT NULL, -- Keep supplier name for reference
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'quality_review', 'pricing', 'batched', 'drying', 'sales', 'inventory')),
  batch_number TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coffee_records ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust as needed for your authentication)
CREATE POLICY "Anyone can view suppliers" ON public.suppliers FOR SELECT USING (true);
CREATE POLICY "Anyone can insert suppliers" ON public.suppliers FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update suppliers" ON public.suppliers FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete suppliers" ON public.suppliers FOR DELETE USING (true);

CREATE POLICY "Anyone can view coffee_records" ON public.coffee_records FOR SELECT USING (true);
CREATE POLICY "Anyone can insert coffee_records" ON public.coffee_records FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update coffee_records" ON public.coffee_records FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete coffee_records" ON public.coffee_records FOR DELETE USING (true);

-- Create indexes for better performance
CREATE INDEX idx_suppliers_code ON public.suppliers(code);
CREATE INDEX idx_coffee_records_status ON public.coffee_records(status);
CREATE INDEX idx_coffee_records_supplier_id ON public.coffee_records(supplier_id);
CREATE INDEX idx_coffee_records_batch_number ON public.coffee_records(batch_number);
