
-- Allow any authenticated user to view milling customers (needed for transaction entry dropdowns).
-- Write access remains restricted to Milling Operations / admin.
DROP POLICY IF EXISTS "Milling operations can view customers" ON public.milling_customers;

CREATE POLICY "Authenticated users can view milling customers"
ON public.milling_customers
FOR SELECT
TO authenticated
USING (true);
