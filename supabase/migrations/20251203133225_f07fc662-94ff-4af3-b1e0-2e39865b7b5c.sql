-- Rename existing columns to be Arabica-specific and add Robusta columns
ALTER TABLE market_prices
RENAME COLUMN outturn TO arabica_outturn;

ALTER TABLE market_prices
RENAME COLUMN moisture TO arabica_moisture;

ALTER TABLE market_prices
RENAME COLUMN fm TO arabica_fm;

ALTER TABLE market_prices
RENAME COLUMN buying_price TO arabica_buying_price;

-- Add Robusta parameters
ALTER TABLE market_prices
ADD COLUMN IF NOT EXISTS robusta_outturn numeric DEFAULT 80,
ADD COLUMN IF NOT EXISTS robusta_moisture numeric DEFAULT 13,
ADD COLUMN IF NOT EXISTS robusta_fm numeric DEFAULT 3,
ADD COLUMN IF NOT EXISTS robusta_buying_price numeric DEFAULT 7800;