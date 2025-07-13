
-- Create table to store price data
CREATE TABLE public.price_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  price_type TEXT NOT NULL,
  price_value NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'UGX',
  market_source TEXT,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security
ALTER TABLE public.price_data ENABLE ROW LEVEL SECURITY;

-- Create policies for price data access
CREATE POLICY "Anyone can view price data" 
  ON public.price_data 
  FOR SELECT 
  USING (true);

CREATE POLICY "Anyone can insert price data" 
  ON public.price_data 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Anyone can update price data" 
  ON public.price_data 
  FOR UPDATE 
  USING (true);

-- Create index for better performance
CREATE INDEX idx_price_data_type_date ON public.price_data(price_type, recorded_at DESC);

-- Insert initial reference prices
INSERT INTO public.price_data (price_type, price_value, currency, market_source) VALUES
('drugar_local', 8500, 'UGX', 'local_reference'),
('wugar_local', 8200, 'UGX', 'local_reference'),
('robusta_faq_local', 7800, 'UGX', 'local_reference'),
('ice_arabica', 185.50, 'USD_CENTS', 'ICE'),
('ice_robusta', 2450, 'USD', 'ICE'),
('exchange_rate', 3750, 'UGX_USD', 'bank_of_uganda');
