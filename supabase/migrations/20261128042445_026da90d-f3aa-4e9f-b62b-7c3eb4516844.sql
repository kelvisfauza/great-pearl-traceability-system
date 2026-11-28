CREATE OR REPLACE FUNCTION public.drain_meal_notice_retry() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE job_id bigint;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' AND current_user NOT IN ('postgres','supabase_admin') THEN RAISE EXCEPTION 'Trusted system required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.procurement_reviews pr JOIN public.provider_submission_requests s ON s.id::text=pr.record_id WHERE pr.source_table='provider_submission_requests' AND pr.decision='returned' AND pr.returned_by='System automatic checks' AND pr.return_notified_at IS NULL AND s.status='awaiting_finance' AND s.meal_correction_pending) THEN
  SELECT jobid INTO job_id FROM cron.job WHERE jobname='meal-correction-notice-retry';
  IF job_id IS NOT NULL THEN PERFORM cron.unschedule(job_id); END IF;
 END IF;
END $$;
REVOKE ALL ON FUNCTION public.drain_meal_notice_retry() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.drain_meal_notice_retry() TO service_role;
CREATE OR REPLACE FUNCTION public.wake_meal_correction_notice() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.source_table='provider_submission_requests' AND NEW.returned_by='System automatic checks' AND NEW.decision='returned' AND NEW.return_notified_at IS NULL THEN
  PERFORM cron.schedule('meal-correction-notice-retry','0 * * * *',$job$SELECT net.http_post(url:='https://pudfybkyfedeggmokhco.supabase.co/functions/v1/procurement-review-notify',headers:=private_edge.header()||jsonb_build_object('Content-Type','application/json'),body:='{"mode":"meal_retry"}'::jsonb,timeout_milliseconds:=120000);$job$);
  PERFORM net.http_post(url:='https://pudfybkyfedeggmokhco.supabase.co/functions/v1/procurement-review-notify',headers:=private_edge.header()||jsonb_build_object('Content-Type','application/json'),body:=jsonb_build_object('mode','returned','source_table',NEW.source_table,'record_id',NEW.record_id),timeout_milliseconds:=120000);
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.wake_meal_correction_notice() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER wake_meal_correction_notice AFTER INSERT OR UPDATE OF returned_at,return_count ON public.procurement_reviews FOR EACH ROW EXECUTE FUNCTION public.wake_meal_correction_notice();
CREATE OR REPLACE FUNCTION public.prevent_meal_event_changes() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN RAISE EXCEPTION 'Meal decision trails are permanent'; END $$;
REVOKE ALL ON FUNCTION public.prevent_meal_event_changes() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER prevent_meal_event_changes BEFORE UPDATE OR DELETE ON public.meal_plan_events FOR EACH ROW EXECUTE FUNCTION public.prevent_meal_event_changes();