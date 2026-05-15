
-- 1. Make sensitive buckets private
UPDATE storage.buckets SET public = false WHERE id IN ('payment-receipts', 'attendance-documents');

-- 2. Remove public read on payment-receipts
DROP POLICY IF EXISTS "Public can view payment receipts" ON storage.objects;

CREATE POLICY "Privileged staff can view payment receipts"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'payment-receipts'
  AND (is_current_user_admin()
       OR user_has_permission('Finance'::text)
       OR user_has_permission('Finance Management'::text)
       OR user_has_permission('IT Management'::text))
);

-- 3. Tighten contracts bucket INSERT/UPDATE
DROP POLICY IF EXISTS "Authenticated users can upload contract files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update contract files" ON storage.objects;

CREATE POLICY "Authorized staff can upload contract files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'contracts'
  AND (is_current_user_admin()
       OR user_has_permission('Sales Marketing'::text)
       OR user_has_permission('Procurement'::text)
       OR user_has_permission('Finance Management'::text))
);

CREATE POLICY "Authorized staff can update contract files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'contracts'
  AND (is_current_user_admin()
       OR user_has_permission('Sales Marketing'::text)
       OR user_has_permission('Procurement'::text)
       OR user_has_permission('Finance Management'::text))
)
WITH CHECK (
  bucket_id = 'contracts'
  AND (is_current_user_admin()
       OR user_has_permission('Sales Marketing'::text)
       OR user_has_permission('Procurement'::text)
       OR user_has_permission('Finance Management'::text))
);

-- 4. Restrict finance_coffee_lots writes to Finance/Admin
DROP POLICY IF EXISTS "Anyone can insert finance_coffee_lots" ON public.finance_coffee_lots;
DROP POLICY IF EXISTS "Anyone can update finance_coffee_lots" ON public.finance_coffee_lots;

CREATE POLICY "Finance can insert finance_coffee_lots"
ON public.finance_coffee_lots FOR INSERT
WITH CHECK (user_has_permission('Finance Management'::text) OR is_current_user_admin());

CREATE POLICY "Finance can update finance_coffee_lots"
ON public.finance_coffee_lots FOR UPDATE
USING (user_has_permission('Finance Management'::text) OR is_current_user_admin())
WITH CHECK (user_has_permission('Finance Management'::text) OR is_current_user_admin());

-- 5. Fix dead Finance users update policy on requisitions (employees.id -> employees.auth_user_id)
DROP POLICY IF EXISTS "Finance users can update requisitions" ON public.requisitions;

CREATE POLICY "Finance users can update requisitions"
ON public.requisitions FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.employees
    WHERE employees.auth_user_id = auth.uid()
      AND employees.role = ANY (ARRAY['finance','admin','finance manager','finance officer'])
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.employees
    WHERE employees.auth_user_id = auth.uid()
      AND employees.role = ANY (ARRAY['finance','admin','finance manager','finance officer'])
  )
);
