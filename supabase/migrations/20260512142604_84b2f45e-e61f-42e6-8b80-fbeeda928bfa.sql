
-- ============= 1. payment_documents bucket =============
DROP POLICY IF EXISTS "Authenticated read payment_documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated write payment_documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update payment_documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete payment_documents" ON storage.objects;

CREATE POLICY "Owner finance admin read payment_documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'payment_documents'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR is_current_user_admin()
    OR user_has_permission('Finance')
  )
);

CREATE POLICY "Owner finance admin write payment_documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'payment_documents'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR is_current_user_admin()
    OR user_has_permission('Finance')
  )
);

CREATE POLICY "Owner finance admin update payment_documents"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'payment_documents'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR is_current_user_admin()
    OR user_has_permission('Finance')
  )
)
WITH CHECK (
  bucket_id = 'payment_documents'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR is_current_user_admin()
    OR user_has_permission('Finance')
  )
);

CREATE POLICY "Owner finance admin delete payment_documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'payment_documents'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR is_current_user_admin()
    OR user_has_permission('Finance')
  )
);

-- ============= 2. loan-documents bucket =============
DROP POLICY IF EXISTS "Authenticated users can read loan docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload loan docs" ON storage.objects;

CREATE POLICY "Owner hr finance admin read loan-documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'loan-documents'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR is_current_user_admin()
    OR user_has_permission('Finance')
    OR user_has_permission('Human Resources')
  )
);

CREATE POLICY "Owner hr finance admin upload loan-documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'loan-documents'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR is_current_user_admin()
    OR user_has_permission('Finance')
    OR user_has_permission('Human Resources')
  )
);

CREATE POLICY "Owner hr finance admin update loan-documents"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'loan-documents'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR is_current_user_admin()
    OR user_has_permission('Finance')
    OR user_has_permission('Human Resources')
  )
)
WITH CHECK (
  bucket_id = 'loan-documents'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR is_current_user_admin()
    OR user_has_permission('Finance')
    OR user_has_permission('Human Resources')
  )
);

CREATE POLICY "Owner hr finance admin delete loan-documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'loan-documents'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR is_current_user_admin()
    OR user_has_permission('Finance')
    OR user_has_permission('Human Resources')
  )
);

-- ============= 3. chat-attachments bucket =============
DROP POLICY IF EXISTS "Users can view chat attachments" ON storage.objects;

CREATE POLICY "Authenticated owner view chat-attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ============= 4. report-documents: drop public read =============
DROP POLICY IF EXISTS "Users can view report documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view report documents" ON storage.objects;

CREATE POLICY "Owner or admin view report-documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'report-documents'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR is_current_user_admin()
  )
);

-- ============= 5. requisition-documents bucket =============
DROP POLICY IF EXISTS "Authenticated read requisition-documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated write requisition-documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update requisition-documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete requisition-documents" ON storage.objects;

CREATE POLICY "Owner finance admin read requisition-documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'requisition-documents'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR is_current_user_admin()
    OR user_has_permission('Finance')
  )
);

CREATE POLICY "Owner finance admin write requisition-documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'requisition-documents'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR is_current_user_admin()
    OR user_has_permission('Finance')
  )
);

CREATE POLICY "Owner finance admin update requisition-documents"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'requisition-documents'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR is_current_user_admin()
    OR user_has_permission('Finance')
  )
)
WITH CHECK (
  bucket_id = 'requisition-documents'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR is_current_user_admin()
    OR user_has_permission('Finance')
  )
);

CREATE POLICY "Owner finance admin delete requisition-documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'requisition-documents'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR is_current_user_admin()
    OR user_has_permission('Finance')
  )
);

-- ============= 6. Realtime: block system_console_logs for non-privileged =============
DROP POLICY IF EXISTS "realtime_authenticated_safe_topics" ON realtime.messages;

CREATE POLICY "realtime_authenticated_safe_topics"
ON realtime.messages
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND realtime.topic() !~* '^(employees|admin_initiated_withdrawals|mobile_money_transactions|system_errors|system_console_logs|salary|withdrawal|finance|payroll|verification|otp|pin|ussd_payment_logs|deletion_requests|overtime_awards|gosentepay)'
);
