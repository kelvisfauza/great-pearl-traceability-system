-- Create inventory_movements table to track all inventory changes
-- This keeps coffee_records immutable (historical delivery records)
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movement_type text NOT NULL, -- 'sale', 'wastage', 'adjustment', 'return'
  coffee_record_id text NOT NULL, -- References coffee_records.id (Firebase)
  quantity_kg numeric NOT NULL, -- Positive for additions, negative for deductions
  reference_id text, -- Links to sales_transactions.id, etc.
  reference_type text, -- 'sale', 'wastage', etc.
  notes text,
  created_by text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view all movements
CREATE POLICY "Users can view inventory movements"
ON public.inventory_movements
FOR SELECT
USING (true);

-- Allow authenticated users to create movements
CREATE POLICY "Users can create inventory movements"
ON public.inventory_movements
FOR INSERT
WITH CHECK (true);

-- Create index for faster queries by coffee_record_id
CREATE INDEX idx_inventory_movements_coffee_record_id 
ON public.inventory_movements(coffee_record_id);

-- Create index for faster queries by reference
CREATE INDEX idx_inventory_movements_reference 
ON public.inventory_movements(reference_id, reference_type);

-- Add trigger for updated_at
CREATE TRIGGER update_inventory_movements_updated_at
  BEFORE UPDATE ON public.inventory_movements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment
COMMENT ON TABLE public.inventory_movements IS 'Tracks all inventory movements (sales, wastage, etc.) without modifying original coffee_records';