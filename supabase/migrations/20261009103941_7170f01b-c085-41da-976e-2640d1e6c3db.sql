ALTER TABLE public.device_sessions ADD COLUMN IF NOT EXISTS rejected_at timestamptz;

CREATE OR REPLACE FUNCTION public.reject_device_token(p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  IF p_token IS NULL OR length(p_token) < 16 THEN RETURN jsonb_build_object('status','error'); END IF;
  SELECT id INTO v_id FROM public.device_sessions WHERE verification_token = p_token LIMIT 1;
  IF v_id IS NULL THEN RETURN jsonb_build_object('status','error'); END IF;
  UPDATE public.device_sessions SET is_trusted = false, rejected_at = now(), token_used_at = now() WHERE id = v_id;
  RETURN jsonb_build_object('status','rejected');
END; $$;
REVOKE ALL ON FUNCTION public.reject_device_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reject_device_token(text) TO anon, authenticated;