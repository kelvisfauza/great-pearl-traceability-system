-- Create public bucket for finance payment receipts (PDF)
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-receipts', 'payment-receipts', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Public read (URL is unguessable UUID, safe for SMS/email links)
DROP POLICY IF EXISTS "Public can view payment receipts" ON storage.objects;
CREATE POLICY "Public can view payment receipts"
ON storage.objects FOR SELECT
USING (bucket_id = 'payment-receipts');

-- Only privileged staff can upload/update/delete receipts
DROP POLICY IF EXISTS "Privileged staff can upload payment receipts" ON storage.objects;
CREATE POLICY "Privileged staff can upload payment receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payment-receipts'
  AND (
    public.is_current_user_admin()
    OR public.user_has_permission('Finance')
    OR public.user_has_permission('IT Management')
  )
);

DROP POLICY IF EXISTS "Privileged staff can update payment receipts" ON storage.objects;
CREATE POLICY "Privileged staff can update payment receipts"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'payment-receipts'
  AND (
    public.is_current_user_admin()
    OR public.user_has_permission('Finance')
    OR public.user_has_permission('IT Management')
  )
);

DROP POLICY IF EXISTS "Privileged staff can delete payment receipts" ON storage.objects;
CREATE POLICY "Privileged staff can delete payment receipts"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'payment-receipts'
  AND (
    public.is_current_user_admin()
    OR public.user_has_permission('IT Management')
  )
);