-- Add duration field to supplier_subcontracts
ALTER TABLE public.supplier_subcontracts 
ADD COLUMN IF NOT EXISTS duration text;