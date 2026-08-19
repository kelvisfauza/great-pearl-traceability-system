CREATE TABLE public.print_jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  user_email text,
  title text NOT NULL,
  doc_type text NOT NULL DEFAULT 'document',
  format text NOT NULL DEFAULT 'html',
  content text NOT NULL,
  copies integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'queued',
  printed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days')
);

CREATE INDEX idx_print_jobs_user_status ON public.print_jobs (user_id, status, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.print_jobs TO authenticated;
GRANT ALL ON public.print_jobs TO service_role;

ALTER TABLE public.print_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own print jobs"
ON public.print_jobs FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_print_jobs_updated_at
BEFORE UPDATE ON public.print_jobs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.cleanup_expired_print_jobs()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.print_jobs WHERE expires_at < now();
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_expired_print_jobs() TO authenticated;