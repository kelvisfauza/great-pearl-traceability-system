-- lovable-cron-fallback-reviewed: Queue-backed retry armed only on changes, removed after drain; five-minute retries max 288 daily during continuous failure, no idle polling.
CREATE OR REPLACE FUNCTION settings_alerts_private.capture() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE old_doc jsonb := CASE WHEN TG_OP='INSERT' THEN '{}'::jsonb ELSE to_jsonb(OLD) END; new_doc jsonb := CASE WHEN TG_OP='DELETE' THEN '{}'::jsonb ELSE to_jsonb(NEW) END; watched text[]; changed text[]; label text; who text;
BEGIN
 watched:=string_to_array(TG_ARGV[0],',');
 IF TG_TABLE_NAME='system_settings' AND TG_OP='UPDATE' AND old_doc->'setting_value' IS NOT DISTINCT FROM new_doc->'setting_value' THEN RETURN NEW; END IF;
 SELECT array_agg(key ORDER BY key) INTO changed FROM unnest(watched) key WHERE old_doc->key IS DISTINCT FROM new_doc->key;
 IF changed IS NULL THEN RETURN COALESCE(NEW,OLD); END IF;
 PERFORM pg_advisory_xact_lock(791111);
 label:=coalesce(new_doc->>'setting_key',old_doc->>'setting_key',new_doc->>'template_name',old_doc->>'template_name',new_doc->>'name',old_doc->>'name',new_doc->>'employee_name',old_doc->>'employee_name',new_doc->>'email',old_doc->>'email',new_doc->>'user_email',old_doc->>'user_email',new_doc->>'id',old_doc->>'id','record');
 SELECT email INTO who FROM auth.users WHERE id=auth.uid();
 INSERT INTO settings_alerts_private.events(control,record_label,action,fields,actor) VALUES(TG_ARGV[1],label,lower(TG_OP),changed,coalesce(who,'System / service process'));
 PERFORM settings_alerts_private.dispatch();
 IF NOT EXISTS(SELECT 1 FROM cron.job WHERE jobname='settings-change-email-alerts') THEN PERFORM cron.schedule('settings-change-email-alerts','*/5 * * * *','SELECT settings_alerts_private.dispatch()'); END IF;
 RETURN COALESCE(NEW,OLD);
END $$;
REVOKE ALL ON FUNCTION settings_alerts_private.capture() FROM PUBLIC,anon,authenticated;
DO $$ DECLARE before_count integer; after_count integer; BEGIN
 BEGIN
 SELECT count(*) INTO before_count FROM settings_alerts_private.events;
 INSERT INTO public.system_settings(setting_key,setting_value) VALUES('__settings_alert_rollback_test', '{"enabled":true}'::jsonb);
 SELECT count(*) INTO after_count FROM settings_alerts_private.events;
 IF after_count<>before_count+1 THEN RAISE EXCEPTION 'Insert capture failed'; END IF;
 UPDATE public.system_settings SET setting_value=setting_value,updated_at=now() WHERE setting_key='__settings_alert_rollback_test';
 IF (SELECT count(*) FROM settings_alerts_private.events)<>after_count THEN RAISE EXCEPTION 'Unchanged save generated alert'; END IF;
 UPDATE public.system_settings SET setting_value='{"enabled":false}'::jsonb WHERE setting_key='__settings_alert_rollback_test';
 IF (SELECT count(*) FROM settings_alerts_private.events)<>after_count+1 THEN RAISE EXCEPTION 'Changed save did not generate alert'; END IF;
 IF has_function_privilege('authenticated','public.claim_settings_alerts()','EXECUTE') OR has_function_privilege('anon','public.settings_alert_auth(text)','EXECUTE') THEN RAISE EXCEPTION 'Alert worker privilege leak'; END IF;
 RAISE SQLSTATE 'ZT001' USING MESSAGE='rollback test succeeded';
 EXCEPTION WHEN SQLSTATE 'ZT001' THEN NULL; END;
END $$;