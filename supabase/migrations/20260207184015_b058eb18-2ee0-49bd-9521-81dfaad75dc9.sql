
-- Fix: market_prices SELECT policy only allows authenticated users,
-- but the /display page is public (no auth). Allow anon to read market prices too.

DROP POLICY IF EXISTS "Anyone can view market prices" ON public.market_prices;

CREATE POLICY "Anyone can view market prices"
  ON public.market_prices
  FOR SELECT
  TO anon, authenticated
  USING (true);
