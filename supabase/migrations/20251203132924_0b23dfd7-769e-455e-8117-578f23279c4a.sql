-- Add buying parameters to market_prices table
ALTER TABLE market_prices
ADD COLUMN IF NOT EXISTS outturn numeric DEFAULT 70,
ADD COLUMN IF NOT EXISTS moisture numeric DEFAULT 12.5,
ADD COLUMN IF NOT EXISTS fm numeric DEFAULT 5,
ADD COLUMN IF NOT EXISTS buying_price numeric DEFAULT 8500;