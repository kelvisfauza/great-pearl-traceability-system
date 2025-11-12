-- Fix store_reports RLS policies to allow authenticated users to insert
DROP POLICY IF EXISTS "Anyone can insert store_reports" ON store_reports;

CREATE POLICY "Authenticated users can insert store_reports"
ON store_reports
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Ensure the other policies also work for authenticated users
DROP POLICY IF EXISTS "Anyone can view store_reports" ON store_reports;
CREATE POLICY "Authenticated users can view store_reports"
ON store_reports
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Anyone can update store_reports" ON store_reports;
CREATE POLICY "Authenticated users can update store_reports"
ON store_reports
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);