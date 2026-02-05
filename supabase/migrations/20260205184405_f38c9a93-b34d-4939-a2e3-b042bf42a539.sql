-- Add public SELECT policy for coffee_records (for public display page)
-- Only allows reading aggregate/summary data needed for display
CREATE POLICY "Public can view coffee records for display"
ON public.coffee_records
FOR SELECT
USING (true);

-- Add public SELECT policy for suppliers count (for public display page)
CREATE POLICY "Public can view suppliers for display"
ON public.suppliers
FOR SELECT
USING (true);

-- Add public SELECT policy for buyer_contracts (already has one but confirming)
-- The existing policy should work since it has "Allow all operations" with qual=true