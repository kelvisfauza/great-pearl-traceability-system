CREATE POLICY "Public can view reference prices" ON public.market_prices FOR SELECT TO anon USING (price_type = 'reference_prices');
GRANT SELECT ON public.market_prices TO anon;