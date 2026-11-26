CREATE POLICY "Reporting service owns finance reports" ON public.daily_finance_report_runs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE OR REPLACE FUNCTION public.daily_finance_run_touch() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END; $$;
REVOKE ALL ON FUNCTION public.daily_finance_run_touch() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER daily_finance_run_touch BEFORE UPDATE ON public.daily_finance_report_runs FOR EACH ROW EXECUTE FUNCTION public.daily_finance_run_touch();