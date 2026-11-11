-- lovable-cron-fallback-reviewed: Wake on saved changes; temporary five-minute retries exist only while queue is nonempty, and unschedule after drain.
CREATE SCHEMA IF NOT EXISTS settings_alerts_private;
REVOKE ALL ON SCHEMA settings_alerts_private FROM PUBLIC, anon, authenticated;
CREATE TABLE settings_alerts_private.dispatch_auth (id boolean PRIMARY KEY DEFAULT true CHECK(id), token text NOT NULL DEFAULT encode(gen_random_bytes(32),'hex'));
INSERT INTO settings_alerts_private.dispatch_auth(id) VALUES(true);
CREATE TABLE settings_alerts_private.events (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), control text NOT NULL, record_label text NOT NULL, action text NOT NULL, fields text[] NOT NULL, actor text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), status text NOT NULL DEFAULT 'pending', attempts integer NOT NULL DEFAULT 0, lease_until timestamptz, delivered_at timestamptz, last_error text);
CREATE INDEX settings_alerts_pending ON settings_alerts_private.events(status,created_at);
CREATE OR REPLACE FUNCTION settings_alerts_private.capture() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE old_doc jsonb := CASE WHEN TG_OP='INSERT' THEN '{}'::jsonb ELSE to_jsonb(OLD) END; new_doc jsonb := CASE WHEN TG_OP='DELETE' THEN '{}'::jsonb ELSE to_jsonb(NEW) END; watched text[]; changed text[]; k text; label text; who text; control_name text;
BEGIN
 watched := string_to_array(TG_ARGV[0],','); control_name := TG_ARGV[1];
 IF TG_TABLE_NAME='system_settings' THEN
   IF TG_OP='UPDATE' AND old_doc->'setting_value' IS NOT DISTINCT FROM new_doc->'setting_value' THEN RETURN NEW; END IF;
   watched := ARRAY['setting_value'];
 END IF;
 SELECT array_agg(key ORDER BY key) INTO changed FROM unnest(watched) key WHERE old_doc->key IS DISTINCT FROM new_doc->key;
 IF changed IS NULL THEN RETURN COALESCE(NEW,OLD); END IF;
 label := coalesce(new_doc->>'setting_key',old_doc->>'setting_key',new_doc->>'template_name',old_doc->>'template_name',new_doc->>'name',old_doc->>'name',new_doc->>'employee_name',old_doc->>'employee_name',new_doc->>'email',old_doc->>'email',new_doc->>'user_email',old_doc->>'user_email',new_doc->>'id',old_doc->>'id','record');
 SELECT email INTO who FROM auth.users WHERE id=auth.uid();
 INSERT INTO settings_alerts_private.events(control,record_label,action,fields,actor) VALUES(control_name,label,lower(TG_OP),changed,coalesce(who,'System / service process'));
 PERFORM settings_alerts_private.dispatch();
 IF NOT EXISTS(SELECT 1 FROM cron.job WHERE jobname='settings-change-email-alerts') THEN
   PERFORM cron.schedule('settings-change-email-alerts','*/5 * * * *','SELECT settings_alerts_private.dispatch()');
 END IF;
 RETURN COALESCE(NEW,OLD);
END $$;
REVOKE ALL ON FUNCTION settings_alerts_private.capture() FROM PUBLIC,anon,authenticated;
DO $$ DECLARE t record; BEGIN
 FOR t IN SELECT * FROM (VALUES
 ('system_settings','setting_value','System settings'),
 ('employees','permissions,disabled,disabled_reason,wallet_frozen,wallet_frozen_reason,bypass_sms_verification','Staff access and wallet controls'),
 ('user_roles','role,can_approve_transactions,can_record_deposits,can_fully_approve,max_approval_amount','Staff roles and approval rights'),
 ('employee_suspensions','status,start_date,end_date,report_back_date,pay_status','Employee suspension'),
 ('notification_channel_prefs','channels,enabled','Notification channels'),
 ('network_whitelist','is_active,ip_address,name,description','Network access'),
 ('device_sessions','is_trusted,rejected_at','Device trust'),
 ('biometric_credentials','credential_id','Biometric access'),
 ('system_maintenance','is_active,reason,expected_back_online','Maintenance mode')
 ) AS x(tbl,fields,label) LOOP
 IF to_regclass('public.'||t.tbl) IS NOT NULL THEN
 EXECUTE format('CREATE TRIGGER settings_change_email AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION settings_alerts_private.capture(%L,%L)',t.tbl,t.fields,t.label);
 END IF; END LOOP;
END $$;
CREATE OR REPLACE FUNCTION public.settings_alert_auth(p_token text) RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$ SELECT EXISTS(SELECT 1 FROM settings_alerts_private.dispatch_auth WHERE token=p_token); $$;
CREATE OR REPLACE FUNCTION public.claim_settings_alerts() RETURNS SETOF settings_alerts_private.events LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 UPDATE settings_alerts_private.events SET status='sending',attempts=attempts+1,lease_until=now()+interval '5 minutes' WHERE id IN (SELECT id FROM settings_alerts_private.events WHERE status='pending' OR (status='sending' AND lease_until<now()) ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 10) RETURNING *;
$$;
CREATE OR REPLACE FUNCTION public.finish_settings_alert(p_id uuid,p_sent boolean,p_error text DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 PERFORM pg_advisory_xact_lock(791111);
 UPDATE settings_alerts_private.events SET status=CASE WHEN p_sent THEN 'sent' ELSE 'pending' END,delivered_at=CASE WHEN p_sent THEN now() ELSE NULL END,last_error=left(p_error,500),lease_until=NULL WHERE id=p_id AND status='sending';
 IF NOT EXISTS(SELECT 1 FROM settings_alerts_private.events WHERE status<>'sent') THEN PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname='settings-change-email-alerts'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.settings_alert_auth(text),public.claim_settings_alerts(),public.finish_settings_alert(uuid,boolean,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.settings_alert_auth(text),public.claim_settings_alerts(),public.finish_settings_alert(uuid,boolean,text) TO service_role;
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE OR REPLACE FUNCTION settings_alerts_private.dispatch() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ DECLARE v_token text; BEGIN
 IF NOT EXISTS(SELECT 1 FROM settings_alerts_private.events WHERE status='pending' OR (status='sending' AND lease_until<now())) THEN RETURN; END IF;
 SELECT token INTO v_token FROM settings_alerts_private.dispatch_auth WHERE id;
 PERFORM net.http_post(url:='https://pudfybkyfedeggmokhco.supabase.co/functions/v1/settings-change-alerts',headers:=jsonb_build_object('Content-Type','application/json','x-settings-dispatch-token',v_token),body:='{}'::jsonb,timeout_milliseconds:=120000);
END $$;
REVOKE ALL ON FUNCTION settings_alerts_private.dispatch() FROM PUBLIC,anon,authenticated;