CREATE TABLE public.withdrawal_request_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  employee_email text NOT NULL,
  phone text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.withdrawal_request_otps TO service_role;
ALTER TABLE public.withdrawal_request_otps ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.withdrawal_request_otps FROM PUBLIC, anon, authenticated;
CREATE INDEX withdrawal_request_otps_user_created_idx ON public.withdrawal_request_otps (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.issue_withdrawal_request_otp(
  p_user_id uuid,
  p_employee_email text,
  p_phone text,
  p_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_latest public.withdrawal_request_otps%ROWTYPE;
  v_id uuid;
  v_expires_at timestamptz;
BEGIN
  IF p_code !~ '^[0-9]{5}$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_code_format');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text, 847231));

  SELECT * INTO v_latest
  FROM public.withdrawal_request_otps
  WHERE user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_latest.id IS NOT NULL AND v_latest.created_at > now() - interval '30 seconds' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'throttled',
      'retry_after', GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_latest.created_at + interval '30 seconds' - now()))))
    );
  END IF;

  UPDATE public.withdrawal_request_otps
  SET consumed_at = now()
  WHERE user_id = p_user_id AND consumed_at IS NULL;

  INSERT INTO public.withdrawal_request_otps (
    user_id, employee_email, phone, code_hash, expires_at
  ) VALUES (
    p_user_id,
    lower(trim(p_employee_email)),
    trim(p_phone),
    extensions.crypt(p_code, extensions.gen_salt('bf', 10)),
    now() + interval '10 minutes'
  )
  RETURNING id, expires_at INTO v_id, v_expires_at;

  RETURN jsonb_build_object('success', true, 'id', v_id, 'expires_at', v_expires_at);
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_withdrawal_request_otp(
  p_user_id uuid,
  p_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_record public.withdrawal_request_otps%ROWTYPE;
BEGIN
  SELECT * INTO v_record
  FROM public.withdrawal_request_otps
  WHERE user_id = p_user_id AND consumed_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_code');
  END IF;
  IF v_record.expires_at <= now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'expired');
  END IF;
  IF v_record.attempts >= 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'too_many_attempts');
  END IF;

  IF v_record.code_hash = extensions.crypt(trim(p_code), v_record.code_hash) THEN
    UPDATE public.withdrawal_request_otps SET consumed_at = now() WHERE id = v_record.id;
    RETURN jsonb_build_object('success', true);
  END IF;

  UPDATE public.withdrawal_request_otps
  SET attempts = attempts + 1
  WHERE id = v_record.id;

  RETURN jsonb_build_object(
    'success', false,
    'error', 'invalid',
    'attempts_left', GREATEST(0, 4 - v_record.attempts)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.issue_withdrawal_request_otp(uuid, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.verify_withdrawal_request_otp(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.issue_withdrawal_request_otp(uuid, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_withdrawal_request_otp(uuid, text) TO service_role;