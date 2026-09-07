ALTER TABLE public.print_jobs
  ADD COLUMN IF NOT EXISTS sent_by_user_id uuid,
  ADD COLUMN IF NOT EXISTS sent_by_email text,
  ADD COLUMN IF NOT EXISTS sent_by_name text,
  ADD COLUMN IF NOT EXISTS sent_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS source_job_id uuid;

CREATE OR REPLACE FUNCTION public.send_print_jobs_to_user(
  p_job_ids uuid[],
  p_recipient_user_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender uuid := auth.uid();
  v_sender_email text;
  v_sender_name text;
  v_count integer := 0;
BEGIN
  IF v_sender IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_recipient_user_id IS NULL OR p_recipient_user_id = v_sender THEN
    RAISE EXCEPTION 'Invalid recipient';
  END IF;

  SELECT email, name INTO v_sender_email, v_sender_name
  FROM public.employees WHERE auth_user_id = v_sender LIMIT 1;

  INSERT INTO public.print_jobs (
    user_id, user_email, title, doc_type, format, content, copies, status,
    sent_by_user_id, sent_by_email, sent_by_name, sent_at, source_job_id
  )
  SELECT
    p_recipient_user_id,
    (SELECT email FROM public.employees WHERE auth_user_id = p_recipient_user_id LIMIT 1),
    j.title, j.doc_type, j.format, j.content, j.copies, 'queued',
    v_sender,
    COALESCE(v_sender_email, j.user_email),
    v_sender_name,
    now(),
    j.id
  FROM public.print_jobs j
  WHERE j.id = ANY(p_job_ids)
    AND j.user_id = v_sender;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_print_jobs_to_user(uuid[], uuid) TO authenticated;