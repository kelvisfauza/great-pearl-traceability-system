-- Fix storage policy gaps flagged by security scan

-- 1) dispatch-attachments: require Store/Logistics/Admin for INSERT/UPDATE
DROP POLICY IF EXISTS "Authenticated users can upload dispatch attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update dispatch attachments" ON storage.objects;

CREATE POLICY "Store/Logistics/Admin can upload dispatch attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'dispatch-attachments'
  AND (
    is_current_user_admin()
    OR user_has_permission('Store Management')
    OR user_has_permission('Logistics')
  )
);

CREATE POLICY "Store/Logistics/Admin can update dispatch attachments"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'dispatch-attachments'
  AND (
    is_current_user_admin()
    OR user_has_permission('Store Management')
    OR user_has_permission('Logistics')
  )
)
WITH CHECK (
  bucket_id = 'dispatch-attachments'
  AND (
    is_current_user_admin()
    OR user_has_permission('Store Management')
    OR user_has_permission('Logistics')
  )
);

-- Add DELETE restriction too (was missing/implicit)
DROP POLICY IF EXISTS "Store/Logistics/Admin can delete dispatch attachments" ON storage.objects;
CREATE POLICY "Store/Logistics/Admin can delete dispatch attachments"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'dispatch-attachments'
  AND (
    is_current_user_admin()
    OR user_has_permission('Store Management')
    OR user_has_permission('Logistics')
  )
);

-- 2) job-applications: restrict DELETE to HR/Admin only
DROP POLICY IF EXISTS "Authenticated users can delete CVs" ON storage.objects;

CREATE POLICY "HR and admins can delete CVs"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'job-applications'
  AND (user_has_permission('Human Resources') OR is_current_user_admin())
);

-- 3) market-screenshots: restrict INSERT/UPDATE/DELETE to relevant roles
DROP POLICY IF EXISTS "Authenticated users can upload market screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update market screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete market screenshots" ON storage.objects;

CREATE POLICY "Sales/Procurement/Finance/Admin can upload market screenshots"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'market-screenshots'
  AND (
    is_current_user_admin()
    OR user_has_permission('Sales Marketing')
    OR user_has_permission('Procurement')
    OR user_has_permission('Finance')
  )
);

CREATE POLICY "Sales/Procurement/Finance/Admin can update market screenshots"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'market-screenshots'
  AND (
    is_current_user_admin()
    OR user_has_permission('Sales Marketing')
    OR user_has_permission('Procurement')
    OR user_has_permission('Finance')
  )
)
WITH CHECK (
  bucket_id = 'market-screenshots'
  AND (
    is_current_user_admin()
    OR user_has_permission('Sales Marketing')
    OR user_has_permission('Procurement')
    OR user_has_permission('Finance')
  )
);

CREATE POLICY "Sales/Procurement/Finance/Admin can delete market screenshots"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'market-screenshots'
  AND (
    is_current_user_admin()
    OR user_has_permission('Sales Marketing')
    OR user_has_permission('Procurement')
    OR user_has_permission('Finance')
  )
);

-- 4) requisition-documents: tighten INSERT to require ownership path (matches other ops)
DROP POLICY IF EXISTS "Allow authenticated users to upload documents" ON storage.objects;

CREATE POLICY "Owner finance admin upload requisition-documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'requisition-documents'
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR is_current_user_admin()
    OR user_has_permission('Finance')
  )
);