DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.payment_receipts;
CREATE POLICY "Finance and Admins can read payment receipts"
ON public.payment_receipts
FOR SELECT
TO authenticated
USING (public.is_current_user_admin() OR public.user_has_permission('Finance'));

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.payment_receipts;
CREATE POLICY "Finance and Admins can insert payment receipts"
ON public.payment_receipts
FOR INSERT
TO authenticated
WITH CHECK (public.is_current_user_admin() OR public.user_has_permission('Finance'));