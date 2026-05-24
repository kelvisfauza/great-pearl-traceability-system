
-- 1. dispatch attachments: authenticated-only upload
DROP POLICY IF EXISTS "Anon and auth can upload dispatch attachments" ON storage.objects;
CREATE POLICY "Authenticated can upload dispatch attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'dispatch-attachments');

-- 2. weighbridge tickets: authenticated-only
DROP POLICY IF EXISTS "Anon can insert tickets for active session" ON public.weighbridge_scanned_tickets;
CREATE POLICY "Auth can insert tickets for active session"
  ON public.weighbridge_scanned_tickets FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.weighbridge_scan_sessions s
    WHERE s.id = weighbridge_scanned_tickets.session_id
      AND s.status = 'active'
      AND s.expires_at > now()
  ));

-- 3. contract-documents bucket: role-restricted upload/delete
DROP POLICY IF EXISTS "Authenticated users can upload contract docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete contract docs" ON storage.objects;

CREATE POLICY "Authorized staff can upload contract docs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'contract-documents'
    AND (
      public.is_current_user_admin()
      OR public.user_has_permission('Sales Marketing')
      OR public.user_has_permission('Procurement')
      OR public.user_has_permission('Finance Management')
    )
  );

CREATE POLICY "Authorized staff can delete contract docs"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'contract-documents'
    AND (
      public.is_current_user_admin()
      OR public.user_has_permission('Sales Marketing')
      OR public.user_has_permission('Procurement')
      OR public.user_has_permission('Finance Management')
    )
  );

-- 4. payment-receipts bucket: drop overly broad policies (privileged-only policies remain)
DROP POLICY IF EXISTS "Authenticated can read payment receipts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload payment receipts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update payment receipts" ON storage.objects;

-- 5. is_super_admin: use Super Admin role pattern, not hardcoded email
CREATE OR REPLACE FUNCTION public.is_super_admin(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.employees e
    WHERE e.auth_user_id = _uid
      AND e.role = 'Super Admin'
      AND e.status = 'Active'
      AND COALESCE(e.disabled, false) = false
  );
$function$;
