-- Add UPDATE and DELETE policies for inventory_batch_sources
CREATE POLICY "Authenticated users can update batch sources"
ON public.inventory_batch_sources
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete batch sources"
ON public.inventory_batch_sources
FOR DELETE
TO authenticated
USING (true);