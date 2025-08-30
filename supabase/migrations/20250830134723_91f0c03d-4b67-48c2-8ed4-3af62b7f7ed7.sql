-- Create coffee_records table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.coffee_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coffee_type TEXT NOT NULL,
  date DATE NOT NULL,
  kilograms NUMERIC NOT NULL,
  bags INTEGER NOT NULL,
  supplier_id UUID,
  supplier_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  batch_number TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on coffee_records
ALTER TABLE public.coffee_records ENABLE ROW LEVEL SECURITY;

-- Create policies for coffee_records
CREATE POLICY "Anyone can manage coffee_records" ON public.coffee_records
FOR ALL USING (true) WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_coffee_records_updated_at
    BEFORE UPDATE ON public.coffee_records
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();