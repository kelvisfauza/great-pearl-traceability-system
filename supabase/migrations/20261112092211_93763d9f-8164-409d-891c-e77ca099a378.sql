CREATE SCHEMA IF NOT EXISTS private_edge;
REVOKE ALL ON SCHEMA private_edge FROM PUBLIC, anon, authenticated;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'edge_internal_secret') THEN
    PERFORM vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'), 'edge_internal_secret', 'Shared secret scheduled jobs send to internal edge functions');
  END IF;
END $$;

CREATE OR REPLACE FUNCTION private_edge.header()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS 'SELECT jsonb_build_object(''x-internal-secret'', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name=''edge_internal_secret'' LIMIT 1))';
REVOKE ALL ON FUNCTION private_edge.header() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.verify_internal_edge_secret(p_secret text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS 'SELECT p_secret IS NOT NULL AND length(p_secret) > 20 AND p_secret = (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name=''edge_internal_secret'' LIMIT 1)';
REVOKE ALL ON FUNCTION public.verify_internal_edge_secret(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_internal_edge_secret(text) TO service_role;

CREATE OR REPLACE FUNCTION private_edge.add_header(src text)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path = ''
AS $f$
DECLARE
  p1 text := '(headers\s*:?=\s*)(' || chr(39) || '[^' || chr(39) || ']*' || chr(39) || '::\s*jsonb)';
  r1 text := '\1(\2 || private_edge.header())';
  p2 text := '(headers\s*:?=\s*)jsonb_build_object' || chr(92) || chr(40);
  r2 text := '\1private_edge.header() || jsonb_build_object' || chr(40);
BEGIN
  RETURN regexp_replace(regexp_replace(src, p1, r1, 'g'), p2, r2, 'g');
END
$f$;

DO $$ DECLARE j record; BEGIN
  FOR j IN SELECT jobid, jobname, schedule, command, active FROM cron.job WHERE command LIKE '%functions/v1/%' AND command NOT LIKE '%private_edge.header()%' LOOP
    BEGIN
      PERFORM cron.alter_job(j.jobid, command := private_edge.add_header(j.command));
    EXCEPTION WHEN OTHERS THEN
      IF j.active THEN
        PERFORM cron.schedule(j.jobname, j.schedule, private_edge.add_header(j.command));
      END IF;
    END;
  END LOOP;
END $$;

DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT p.oid FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.prosrc LIKE '%functions/v1/%' AND p.prosrc NOT LIKE '%private_edge.header()%' LOOP
    EXECUTE private_edge.add_header(pg_get_functiondef(r.oid));
  END LOOP;
END $$;