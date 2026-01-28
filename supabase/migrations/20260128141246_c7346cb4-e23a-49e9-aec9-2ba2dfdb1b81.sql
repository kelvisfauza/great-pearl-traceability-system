-- Create table to store price calculation history
CREATE TABLE public.price_calculation_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coffee_type TEXT NOT NULL CHECK (coffee_type IN ('robusta', 'arabica')),
  ice_price NUMERIC NOT NULL,
  multiplier NUMERIC NOT NULL,
  market_price NUMERIC NOT NULL,
  gpcf_price NUMERIC NOT NULL,
  calculated_by TEXT NOT NULL,
  calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.price_calculation_history ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can view history
CREATE POLICY "Authenticated users can view calculation history"
ON public.price_calculation_history
FOR SELECT
USING (auth.role() = 'authenticated');

-- Policy: Authenticated users can insert their calculations
CREATE POLICY "Authenticated users can insert calculations"
ON public.price_calculation_history
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Create index for efficient querying by date
CREATE INDEX idx_price_calculation_history_calculated_at 
ON public.price_calculation_history(calculated_at DESC);

-- Create function to clean up old records (older than 30 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_price_calculations()
RETURNS void AS $$
BEGIN
  DELETE FROM public.price_calculation_history
  WHERE calculated_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON TABLE public.price_calculation_history IS 'Stores history of coffee price calculations from ICE market data';