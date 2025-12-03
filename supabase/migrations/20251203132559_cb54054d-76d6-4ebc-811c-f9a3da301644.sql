-- Drop existing policy
DROP POLICY IF EXISTS "Admins and Analysts can manage market prices" ON market_prices;

-- Create simpler policy for admins to manage market prices
CREATE POLICY "Admins can manage market prices" ON market_prices
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM employees
    WHERE employees.auth_user_id = auth.uid()
    AND employees.status = 'Active'
    AND employees.role IN ('Super Admin', 'Administrator')
  )
);