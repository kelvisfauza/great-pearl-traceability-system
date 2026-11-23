-- Limit browser reads to display fields; the author email remains server-only.
REVOKE SELECT ON public.marquee_announcements FROM PUBLIC, anon, authenticated;
REVOKE SELECT (created_by_email) ON public.marquee_announcements FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, message, priority, expires_at, is_active, created_by_name, created_at, updated_at) ON public.marquee_announcements TO authenticated;
GRANT ALL ON public.marquee_announcements TO service_role;

ALTER POLICY "Authenticated users can read active marquee"
ON public.marquee_announcements
USING (
  auth.uid() IS NOT NULL AND (
    (is_active = true AND expires_at > now())
    OR public.has_role(auth.uid(), 'Administrator'::public.app_role)
    OR public.has_role(auth.uid(), 'Super Admin'::public.app_role)
  )
);

-- Regression checks run against the real grants, not the browser UI.
DO $test$
BEGIN
  IF has_column_privilege('authenticated', 'public.marquee_announcements', 'created_by_email', 'SELECT') THEN
    RAISE EXCEPTION 'Announcement author email must not be readable by authenticated clients';
  END IF;
  IF has_any_column_privilege('anon', 'public.marquee_announcements', 'SELECT') THEN
    RAISE EXCEPTION 'Signed-out clients must not read announcements';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.marquee_announcements', 'message', 'SELECT') THEN
    RAISE EXCEPTION 'Signed-in clients must retain announcement message access';
  END IF;
  IF NOT has_column_privilege('service_role', 'public.marquee_announcements', 'created_by_email', 'SELECT') THEN
    RAISE EXCEPTION 'System workers must retain author metadata access';
  END IF;
END
$test$;
NOTIFY pgrst, 'reload schema';