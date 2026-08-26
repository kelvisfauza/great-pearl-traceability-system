DROP POLICY IF EXISTS "Authenticated can read contract docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload contract docs" ON storage.objects;

DROP POLICY IF EXISTS "Only admins can delete requisitions" ON public.requisitions;
CREATE POLICY "Only admins can delete requisitions"
ON public.requisitions
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.auth_user_id = auth.uid()
      AND e.role = 'admin'
  )
);