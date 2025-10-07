-- Create sales_inventory_tracking table to track sales WITHOUT modifying coffee_records
CREATE TABLE IF NOT EXISTS public.sales_inventory_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id TEXT NOT NULL,
  coffee_record_id TEXT NOT NULL,
  batch_number TEXT,
  coffee_type TEXT NOT NULL,
  quantity_kg NUMERIC NOT NULL,
  sale_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  customer_name TEXT,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sales_inventory_tracking ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone authenticated can view
CREATE POLICY "Authenticated users can view sales tracking"
  ON public.sales_inventory_tracking
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert
CREATE POLICY "Authenticated users can insert sales tracking"
  ON public.sales_inventory_tracking
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create index for better query performance
CREATE INDEX idx_sales_inventory_coffee_record ON public.sales_inventory_tracking(coffee_record_id);
CREATE INDEX idx_sales_inventory_batch ON public.sales_inventory_tracking(batch_number);
CREATE INDEX idx_sales_inventory_sale_id ON public.sales_inventory_tracking(sale_id);

COMMENT ON TABLE public.sales_inventory_tracking IS 'Tracks which coffee records were used for sales without modifying the original records';