-- Run through the database read-query tool; every result must be true.
SELECT
  NOT has_column_privilege('authenticated', 'public.marquee_announcements', 'created_by_email', 'SELECT') AS author_email_is_private,
  NOT has_any_column_privilege('anon', 'public.marquee_announcements', 'SELECT') AS signed_out_reads_are_blocked,
  has_column_privilege('service_role', 'public.marquee_announcements', 'created_by_email', 'SELECT') AS system_metadata_access_preserved,
  (
    SELECT bool_and(has_column_privilege('authenticated', 'public.marquee_announcements', field, 'SELECT'))
    FROM unnest(ARRAY['id', 'message', 'priority', 'expires_at', 'is_active', 'created_by_name', 'created_at', 'updated_at']) AS fields(field)
  ) AS display_fields_remain_readable,
  (
    SELECT count(*) = 1 AND bool_and(
      qual <> 'true'
      AND qual LIKE '%is_active%'
      AND qual LIKE '%expires_at > now()%'
      AND qual LIKE '%has_role%'
    )
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'marquee_announcements' AND cmd IN ('SELECT', 'ALL')
  ) AS reads_are_active_or_role_scoped;