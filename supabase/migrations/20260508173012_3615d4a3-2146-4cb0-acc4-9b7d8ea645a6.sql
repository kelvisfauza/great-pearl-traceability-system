
-- 1. Make sensitive document buckets private
UPDATE storage.buckets SET public = false WHERE id IN ('payment_documents', 'requisition-documents');

-- 2. Drop the anon-readable policy on requisition-documents
DROP POLICY IF EXISTS "Allow public to view documents" ON storage.objects;

-- 3. Authenticated-only access policies for payment_documents
DROP POLICY IF EXISTS "Authenticated read payment_documents" ON storage.objects;
CREATE POLICY "Authenticated read payment_documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'payment_documents');

DROP POLICY IF EXISTS "Authenticated write payment_documents" ON storage.objects;
CREATE POLICY "Authenticated write payment_documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'payment_documents');

DROP POLICY IF EXISTS "Authenticated update payment_documents" ON storage.objects;
CREATE POLICY "Authenticated update payment_documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'payment_documents')
WITH CHECK (bucket_id = 'payment_documents');

DROP POLICY IF EXISTS "Authenticated delete payment_documents" ON storage.objects;
CREATE POLICY "Authenticated delete payment_documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'payment_documents');

-- 4. Authenticated-only access policies for requisition-documents
DROP POLICY IF EXISTS "Authenticated read requisition-documents" ON storage.objects;
CREATE POLICY "Authenticated read requisition-documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'requisition-documents');

DROP POLICY IF EXISTS "Authenticated write requisition-documents" ON storage.objects;
CREATE POLICY "Authenticated write requisition-documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'requisition-documents');

DROP POLICY IF EXISTS "Authenticated update requisition-documents" ON storage.objects;
CREATE POLICY "Authenticated update requisition-documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'requisition-documents')
WITH CHECK (bucket_id = 'requisition-documents');

DROP POLICY IF EXISTS "Authenticated delete requisition-documents" ON storage.objects;
CREATE POLICY "Authenticated delete requisition-documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'requisition-documents');

-- 5. Backfill bcrypt-hash any existing plaintext recovery credentials (defense in depth; trigger already enforces on writes)
UPDATE public.system_maintenance
SET recovery_pin = crypt(recovery_pin, gen_salt('bf'))
WHERE recovery_pin IS NOT NULL AND recovery_pin !~ '^\$2[aby]\$';

UPDATE public.system_maintenance
SET recovery_key = crypt(recovery_key, gen_salt('bf'))
WHERE recovery_key IS NOT NULL AND recovery_key !~ '^\$2[aby]\$';

-- Verifier RPCs so admins can validate without ever reading plaintext
CREATE OR REPLACE FUNCTION public.verify_maintenance_recovery_pin(_pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_hash text;
BEGIN
  SELECT recovery_pin INTO v_hash FROM public.system_maintenance WHERE recovery_pin IS NOT NULL ORDER BY updated_at DESC LIMIT 1;
  IF v_hash IS NULL THEN RETURN false; END IF;
  RETURN crypt(_pin, v_hash) = v_hash;
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_maintenance_recovery_key(_key text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_hash text;
BEGIN
  SELECT recovery_key INTO v_hash FROM public.system_maintenance WHERE recovery_key IS NOT NULL ORDER BY updated_at DESC LIMIT 1;
  IF v_hash IS NULL THEN RETURN false; END IF;
  RETURN crypt(_key, v_hash) = v_hash;
END;
$$;

REVOKE ALL ON FUNCTION public.verify_maintenance_recovery_pin(text) FROM public;
REVOKE ALL ON FUNCTION public.verify_maintenance_recovery_key(text) FROM public;
GRANT EXECUTE ON FUNCTION public.verify_maintenance_recovery_pin(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_maintenance_recovery_key(text) TO authenticated;
