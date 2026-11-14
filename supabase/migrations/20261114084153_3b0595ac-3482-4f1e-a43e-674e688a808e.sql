-- lovable-cron-fallback-reviewed: SQL-only queued scan wakes on changes, stops after drain, no idle polling.
CREATE TABLE system_integrity_private.scan_requests(request_id bigint PRIMARY KEY DEFAULT txid_current(),requested_at timestamptz NOT NULL DEFAULT now());
REVOKE ALL ON system_integrity_private.scan_requests FROM PUBLIC,anon,authenticated;
GRANT ALL ON system_integrity_private.scan_requests TO service_role;
CREATE OR REPLACE FUNCTION system_integrity_private.detect_system_red_flags_on_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 INSERT INTO system_integrity_private.scan_requests DEFAULT VALUES ON CONFLICT(request_id) DO NOTHING;
 IF NOT EXISTS(SELECT 1 FROM cron.job WHERE jobname='system-red-flags-queued-scan') THEN
  PERFORM cron.schedule('system-red-flags-queued-scan','* * * * *','SELECT system_integrity_private.drain_red_flag_scan();');
 END IF;
 RETURN NULL;
END; $$;
CREATE OR REPLACE FUNCTION system_integrity_private.drain_red_flag_scan()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE claimed bigint[];
BEGIN
 IF NOT pg_try_advisory_xact_lock(hashtext('system_red_flags_worker')) THEN RETURN; END IF;
 SELECT array_agg(request_id) INTO claimed FROM system_integrity_private.scan_requests;
 IF claimed IS NOT NULL THEN
  PERFORM system_integrity_private.scan_system_red_flags();
  DELETE FROM system_integrity_private.scan_requests WHERE request_id=ANY(claimed);
 END IF;
 IF NOT EXISTS(SELECT 1 FROM system_integrity_private.scan_requests) THEN
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname='system-red-flags-queued-scan';
 END IF;
END; $$;
INSERT INTO system_integrity_private.scan_requests DEFAULT VALUES ON CONFLICT(request_id) DO NOTHING;
SELECT cron.schedule('system-red-flags-queued-scan','* * * * *','SELECT system_integrity_private.drain_red_flag_scan();');