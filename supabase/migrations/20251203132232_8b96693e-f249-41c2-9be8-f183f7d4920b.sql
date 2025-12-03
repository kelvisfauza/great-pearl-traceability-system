-- Drop the existing admin-only policy
DROP POLICY IF EXISTS "Admins can manage market prices" ON market_prices;

-- Create new policy allowing both Admins and Data Analysts to manage market prices
CREATE POLICY "Admins and Analysts can manage market prices" ON market_prices
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM employees
    WHERE employees.auth_user_id = auth.uid()
    AND employees.status = 'Active'
    AND (
      employees.role IN ('Super Admin', 'Administrator', 'Data Analyst')
      OR 'Data Analyst' = ANY(employees.permissions)
      OR 'Market Analysis' = ANY(employees.permissions)
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees
    WHERE employees.auth_user_id = auth.uid()
    AND employees.status = 'Active'
    AND (
      employees.role IN ('Super Admin', 'Administrator', 'Data Analyst')
      OR 'Data Analyst' = ANY(employees.permissions)
      OR 'Market Analysis' = ANY(employees.permissions)
    )
  )
);