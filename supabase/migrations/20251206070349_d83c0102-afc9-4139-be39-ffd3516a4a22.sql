-- Create buyer_contracts table for main contracts from buyers (like Kyagalanyi)
CREATE TABLE public.buyer_contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_ref TEXT NOT NULL UNIQUE,
  buyer_ref TEXT,
  buyer_name TEXT NOT NULL,
  buyer_address TEXT,
  buyer_phone TEXT,
  quality TEXT NOT NULL,
  quality_terms TEXT,
  total_quantity NUMERIC NOT NULL,
  packaging TEXT,
  price_per_kg NUMERIC NOT NULL,
  delivery_period_start DATE,
  delivery_period_end DATE,
  delivery_terms TEXT,
  seller_name TEXT DEFAULT 'Great Pearl Coffee',
  status TEXT NOT NULL DEFAULT 'active',
  allocated_quantity NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by TEXT
);

-- Add buyer_contract_id to supplier_subcontracts
ALTER TABLE public.supplier_subcontracts
ADD COLUMN IF NOT EXISTS buyer_contract_id UUID REFERENCES public.buyer_contracts(id);

-- Enable RLS
ALTER TABLE public.buyer_contracts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow all operations on buyer_contracts" 
ON public.buyer_contracts 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_buyer_contracts_updated_at
BEFORE UPDATE ON public.buyer_contracts
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create function to update allocated quantity when subcontracts change
CREATE OR REPLACE FUNCTION public.update_buyer_contract_allocated_quantity()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the allocated quantity on the buyer contract
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.buyer_contracts
    SET allocated_quantity = COALESCE((
      SELECT SUM(net_weight) 
      FROM public.supplier_subcontracts 
      WHERE buyer_contract_id = NEW.buyer_contract_id
      AND status != 'cancelled'
    ), 0)
    WHERE id = NEW.buyer_contract_id;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    UPDATE public.buyer_contracts
    SET allocated_quantity = COALESCE((
      SELECT SUM(net_weight) 
      FROM public.supplier_subcontracts 
      WHERE buyer_contract_id = OLD.buyer_contract_id
      AND status != 'cancelled'
    ), 0)
    WHERE id = OLD.buyer_contract_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update allocated quantity
CREATE TRIGGER update_allocated_quantity_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.supplier_subcontracts
FOR EACH ROW
EXECUTE FUNCTION public.update_buyer_contract_allocated_quantity();