-- Fix sales_transactions: replace open RLS policies with role-based access

DROP POLICY IF EXISTS "Anyone can view sales_transactions" ON sales_transactions;
DROP POLICY IF EXISTS "Anyone can insert sales_transactions" ON sales_transactions;
DROP POLICY IF EXISTS "Anyone can update sales_transactions" ON sales_transactions;

CREATE POLICY "Authenticated users with sales permission can view"
  ON sales_transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.auth_user_id = auth.uid()
      AND ('Sales & Marketing' = ANY(e.permissions) OR e.role IN ('Administrator', 'Super Admin'))
    )
  );

CREATE POLICY "Sales staff can insert transactions"
  ON sales_transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.auth_user_id = auth.uid()
      AND ('Sales & Marketing' = ANY(e.permissions) OR e.role IN ('Administrator', 'Super Admin'))
    )
  );

CREATE POLICY "Sales staff can update transactions"
  ON sales_transactions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.auth_user_id = auth.uid()
      AND ('Sales & Marketing' = ANY(e.permissions) OR e.role IN ('Administrator', 'Super Admin'))
    )
  );