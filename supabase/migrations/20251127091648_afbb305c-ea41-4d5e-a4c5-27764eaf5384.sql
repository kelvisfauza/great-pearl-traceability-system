
-- Create market_prices table for coffee price data
CREATE TABLE IF NOT EXISTS public.market_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  price_type text NOT NULL DEFAULT 'reference_prices',
  ice_arabica numeric NOT NULL DEFAULT 185.50,
  robusta numeric NOT NULL DEFAULT 2450,
  exchange_rate numeric NOT NULL DEFAULT 3750,
  drugar_local numeric NOT NULL DEFAULT 8500,
  wugar_local numeric NOT NULL DEFAULT 8200,
  robusta_faq_local numeric NOT NULL DEFAULT 7800,
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(price_type)
);

-- Enable RLS
ALTER TABLE public.market_prices ENABLE ROW LEVEL SECURITY;

-- Everyone can read prices
CREATE POLICY "Anyone can view market prices"
ON public.market_prices FOR SELECT
TO authenticated
USING (true);

-- Only admins can update prices
CREATE POLICY "Admins can manage market prices"
ON public.market_prices FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM employees 
    WHERE auth_user_id = auth.uid() 
    AND role IN ('Super Admin', 'Administrator')
    AND status = 'Active'
  )
);

-- Insert default reference prices
INSERT INTO public.market_prices (
  price_type, ice_arabica, robusta, exchange_rate, 
  drugar_local, wugar_local, robusta_faq_local
) VALUES (
  'reference_prices', 185.50, 2450, 3750, 
  8500, 8200, 7800
)
ON CONFLICT (price_type) DO NOTHING;

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION update_market_prices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_market_prices_timestamp
BEFORE UPDATE ON public.market_prices
FOR EACH ROW
EXECUTE FUNCTION update_market_prices_updated_at();
