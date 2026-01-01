-- Drop the partially created tables from failed migration
DROP TABLE IF EXISTS public.inventory_batch_sales CASCADE;
DROP TABLE IF EXISTS public.inventory_batch_sources CASCADE;
DROP TABLE IF EXISTS public.inventory_batches CASCADE;

-- Create inventory_batches table for 20,000kg batch tracking
CREATE TABLE public.inventory_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_code TEXT NOT NULL UNIQUE,
  coffee_type TEXT NOT NULL,
  target_capacity NUMERIC NOT NULL DEFAULT 20000,
  total_kilograms NUMERIC NOT NULL DEFAULT 0,
  remaining_kilograms NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'filling' CHECK (status IN ('filling', 'active', 'selling', 'sold_out')),
  batch_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sold_out_at TIMESTAMP WITH TIME ZONE
);

-- Create table to track which coffee_records are in each batch (coffee_record_id is TEXT)
CREATE TABLE public.inventory_batch_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL REFERENCES public.inventory_batches(id) ON DELETE CASCADE,
  coffee_record_id TEXT NOT NULL,
  kilograms NUMERIC NOT NULL,
  supplier_name TEXT NOT NULL,
  purchase_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(batch_id, coffee_record_id)
);

-- Create table to track sales from batches (FIFO)
CREATE TABLE public.inventory_batch_sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL REFERENCES public.inventory_batches(id) ON DELETE CASCADE,
  sale_transaction_id UUID REFERENCES public.sales_transactions(id) ON DELETE SET NULL,
  kilograms_deducted NUMERIC NOT NULL,
  customer_name TEXT,
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.inventory_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_batch_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_batch_sales ENABLE ROW LEVEL SECURITY;

-- RLS policies for inventory_batches
CREATE POLICY "Authenticated users can view inventory batches" 
ON public.inventory_batches FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert inventory batches" 
ON public.inventory_batches FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update inventory batches" 
ON public.inventory_batches FOR UPDATE 
USING (true);

-- RLS policies for inventory_batch_sources
CREATE POLICY "Authenticated users can view batch sources" 
ON public.inventory_batch_sources FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert batch sources" 
ON public.inventory_batch_sources FOR INSERT 
WITH CHECK (true);

-- RLS policies for inventory_batch_sales
CREATE POLICY "Authenticated users can view batch sales" 
ON public.inventory_batch_sales FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert batch sales" 
ON public.inventory_batch_sales FOR INSERT 
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_inventory_batches_status ON public.inventory_batches(status);
CREATE INDEX idx_inventory_batches_coffee_type ON public.inventory_batches(coffee_type);
CREATE INDEX idx_inventory_batches_date ON public.inventory_batches(batch_date);
CREATE INDEX idx_inventory_batch_sources_batch_id ON public.inventory_batch_sources(batch_id);
CREATE INDEX idx_inventory_batch_sales_batch_id ON public.inventory_batch_sales(batch_id);

-- Trigger to update updated_at
CREATE TRIGGER update_inventory_batches_updated_at
BEFORE UPDATE ON public.inventory_batches
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();