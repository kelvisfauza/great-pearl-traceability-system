-- Station/location-based buying prices (Head Office, Kyarumba, Rubirizi)
ALTER TABLE public.market_prices
  ADD COLUMN IF NOT EXISTS parchment_premium numeric,
  ADD COLUMN IF NOT EXISTS kyarumba_sorted numeric,
  ADD COLUMN IF NOT EXISTS kyarumba_ordinary numeric,
  ADD COLUMN IF NOT EXISTS kyarumba_undergrades numeric,
  ADD COLUMN IF NOT EXISTS rubirizi_drugar_clean numeric,
  ADD COLUMN IF NOT EXISTS rubirizi_ordinary numeric;

ALTER TABLE public.price_approval_requests
  ADD COLUMN IF NOT EXISTS parchment_premium numeric,
  ADD COLUMN IF NOT EXISTS kyarumba_sorted numeric,
  ADD COLUMN IF NOT EXISTS kyarumba_ordinary numeric,
  ADD COLUMN IF NOT EXISTS kyarumba_undergrades numeric,
  ADD COLUMN IF NOT EXISTS rubirizi_drugar_clean numeric,
  ADD COLUMN IF NOT EXISTS rubirizi_ordinary numeric;