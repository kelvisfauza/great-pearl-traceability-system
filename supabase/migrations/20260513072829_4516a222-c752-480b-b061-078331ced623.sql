INSERT INTO public.system_settings (setting_key, setting_value)
VALUES (
  'scheduled_downtime',
  '{"enabled": false, "start_hour": 23, "start_minute": 0, "end_hour": 6, "end_minute": 0, "timezone": "Africa/Kampala", "reason": "Nightly system maintenance"}'
)
ON CONFLICT (setting_key) DO NOTHING;

DROP FUNCTION IF EXISTS public.get_maintenance_status();

CREATE OR REPLACE FUNCTION public.get_maintenance_status()
RETURNS TABLE(
  is_active boolean,
  reason text,
  expected_back_online timestamptz,
  server_now timestamptz,
  scheduled_active boolean,
  scheduled_reason text,
  scheduled_back_online timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  manual_active boolean := false;
  manual_reason text;
  manual_back timestamptz;
  cfg jsonb;
  tz text;
  enabled boolean := false;
  sh int; sm int; eh int; em int;
  local_now timestamptz;
  local_date date;
  start_ts timestamptz;
  end_ts timestamptz;
  sched_active boolean := false;
  sched_back timestamptz;
  sched_reason text;
BEGIN
  SELECT mn.is_active, mn.reason, mn.expected_back_online
    INTO manual_active, manual_reason, manual_back
    FROM public.system_maintenance mn
   ORDER BY mn.is_active DESC, mn.updated_at DESC, mn.created_at DESC
   LIMIT 1;

  SELECT setting_value INTO cfg FROM public.system_settings WHERE setting_key = 'scheduled_downtime';

  IF cfg IS NOT NULL THEN
    enabled := COALESCE((cfg->>'enabled')::boolean, false);
    tz := COALESCE(cfg->>'timezone', 'Africa/Kampala');
    sh := COALESCE((cfg->>'start_hour')::int, 23);
    sm := COALESCE((cfg->>'start_minute')::int, 0);
    eh := COALESCE((cfg->>'end_hour')::int, 6);
    em := COALESCE((cfg->>'end_minute')::int, 0);
    sched_reason := COALESCE(cfg->>'reason', 'Nightly system maintenance');

    IF enabled THEN
      local_now := now() AT TIME ZONE tz;
      local_date := (local_now)::date;
      start_ts := ((local_date::text || ' ' || lpad(sh::text,2,'0') || ':' || lpad(sm::text,2,'0') || ':00')::timestamp) AT TIME ZONE tz;
      end_ts   := ((local_date::text || ' ' || lpad(eh::text,2,'0') || ':' || lpad(em::text,2,'0') || ':00')::timestamp) AT TIME ZONE tz;

      IF (sh*60+sm) < (eh*60+em) THEN
        IF now() >= start_ts AND now() < end_ts THEN
          sched_active := true;
          sched_back := end_ts;
        END IF;
      ELSE
        IF now() >= start_ts THEN
          sched_active := true;
          sched_back := end_ts + interval '1 day';
        ELSIF now() < end_ts THEN
          sched_active := true;
          sched_back := end_ts;
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN QUERY SELECT
    COALESCE(manual_active, false),
    manual_reason,
    manual_back,
    now(),
    sched_active,
    sched_reason,
    sched_back;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_maintenance_status() TO anon, authenticated;