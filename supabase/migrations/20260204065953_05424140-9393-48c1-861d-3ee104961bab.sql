-- Add sorted_price column to market_prices table
ALTER TABLE public.market_prices 
ADD COLUMN IF NOT EXISTS sorted_price numeric DEFAULT 0;

-- Add sorted_price column to price_approval_requests table
ALTER TABLE public.price_approval_requests 
ADD COLUMN IF NOT EXISTS sorted_price numeric DEFAULT 0;

-- Add sorted_price column to price_history table if it exists
ALTER TABLE public.price_history 
ADD COLUMN IF NOT EXISTS sorted_price numeric DEFAULT 0;