-- lovable-cron-fallback-reviewed: SQL-only scan queue wakes on enqueue and unschedules after drain; no idle polling.
-- lovable-cron-fallback-reviewed: SQL-only scan queue wakes on enqueue and unschedules after drain; no idle polling.
CREATE TABLE IF NOT EXISTS system_integrity_private.scan_queue (singleton boolean PRIMARY KEY DEFAULT true, requested_at timestamptz NOT NULL DEFAULT now());
REVOKE ALL ON system_integrity_private.scan_queue FROM PUBLIC, anon, authenticated;
GRANT ALL ON system_integrity_private.scan_queue TO service_role;
CREATE OR REPLACE FUNCTION system_integrity_private.detect_system_red_flags_on_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
BEGIN
 INSERT INTO system_integrity_private.scan_queue(singleton,requested_at) VALUES(true,now()) ON CONFLICT(singleton) DO NOTHING;
 IF NOT EXISTS(SELECT 1 FROM cron.job WHERE jobname='system-red-flags-queued-scan') THEN
  PERFORM cron.schedule('system-red-flags-queued-scan','* * * * *','SELECT system_integrity_private.drain_red_flag_scan();');
 END IF;
 IF NOT EXISTS(SELECT 1 FROM cron.job WHERE jobname='system-red-flags-queued-scan') THEN
  PERFORM cron.schedule('system-red-flags-queued-scan','* * * * *','SELECT system_integrity_private.drain_red_flag_scan();');
 END IF;
 RETURN NULL;
END;
$function$;
CREATE OR REPLACE FUNCTION system_integrity_private.drain_red_flag_scan()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
BEGIN
 IF NOT pg_try_advisory_xact_lock(hashtext('system_red_flags_worker')) THEN RETURN; END IF;
 IF EXISTS(SELECT 1 FROM system_integrity_private.scan_queue) THEN
  DELETE FROM system_integrity_private.scan_queue WHERE singleton=true;
  PERFORM system_integrity_private.scan_system_red_flags();
 END IF;
 IF NOT EXISTS(SELECT 1 FROM system_integrity_private.scan_queue) THEN
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname='system-red-flags-queued-scan';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM system_integrity_private.scan_queue) THEN
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname='system-red-flags-queued-scan';
 END IF;
END;
$function$;
REVOKE ALL ON FUNCTION system_integrity_private.drain_red_flag_scan() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION system_integrity_private.drain_red_flag_scan() TO service_role;
SELECT cron.schedule('system-red-flags-queued-scan','* * * * *','SELECT system_integrity_private.drain_red_flag_scan();');
INSERT INTO system_integrity_private.scan_queue(singleton) VALUES(true) ON CONFLICT(singleton) DO NOTHING;