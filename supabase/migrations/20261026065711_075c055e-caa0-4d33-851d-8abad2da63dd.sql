DROP POLICY IF EXISTS "Samplers can create sampling orders" ON public.quality_sampling_orders;

CREATE POLICY "Samplers and store management can create sampling orders"
ON public.quality_sampling_orders FOR INSERT TO authenticated
WITH CHECK (
  lower(public.current_user_email()) IN (
    'onesmusrubambura@greatpearlcoffee.com',
    'sserunkumataufiq@greatpearlcoffee.com'
  )
  OR public.can_manage_users()
  OR EXISTS (
    SELECT 1 FROM public.employees e
    WHERE lower(e.email) = lower(public.current_user_email())
      AND (
        'Store Management' = ANY(COALESCE(e.permissions, ARRAY[]::text[]))
        OR lower(COALESCE(e.role, '')) IN ('store manager', 'store keeper', 'storekeeper')
      )
  )
);