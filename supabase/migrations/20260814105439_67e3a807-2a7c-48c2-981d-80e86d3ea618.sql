CREATE POLICY "EUDR staff can view sales for batch attachment"
ON public.sales_transactions
FOR SELECT
TO authenticated
USING (
  is_current_user_admin()
  OR user_has_permission('EUDR Documentation')
  OR user_has_permission('Store Management')
  OR user_has_permission('Quality Control')
  OR user_has_permission('Procurement')
  OR EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.auth_user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM unnest(e.permissions) p
        WHERE p LIKE 'EUDR Documentation%'
           OR p LIKE 'Store Management%'
           OR p LIKE 'Quality Control%'
           OR p LIKE 'Procurement%'
      )
  )
);