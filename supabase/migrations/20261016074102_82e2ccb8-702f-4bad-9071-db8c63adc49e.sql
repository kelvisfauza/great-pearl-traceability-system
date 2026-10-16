ALTER TABLE public.market_prices ADD COLUMN IF NOT EXISTS parchment_price numeric;
ALTER TABLE public.price_approval_requests ADD COLUMN IF NOT EXISTS parchment_price numeric;