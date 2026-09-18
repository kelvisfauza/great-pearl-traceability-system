CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.wallet_vault_pins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pin_hash text NOT NULL,
  failed_attempts integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  last_unlocked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.wallet_vault_pins TO authenticated;
GRANT ALL ON public.wallet_vault_pins TO service_role;
ALTER TABLE public.wallet_vault_pins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vault_pin_self_select" ON public.wallet_vault_pins
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "vault_pin_service_all" ON public.wallet_vault_pins
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER update_wallet_vault_pins_updated_at
  BEFORE UPDATE ON public.wallet_vault_pins
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.vault_reset_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean NOT NULL DEFAULT false,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.vault_reset_codes TO service_role;
ALTER TABLE public.vault_reset_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vault_reset_service_all" ON public.vault_reset_codes
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_vault_reset_codes_user ON public.vault_reset_codes(user_id, used, expires_at);

CREATE OR REPLACE FUNCTION public.vault_pin_status()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.wallet_vault_pins%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'NOT_AUTHENTICATED');
  END IF;

  SELECT * INTO v_row FROM public.wallet_vault_pins WHERE user_id = v_uid;

  RETURN jsonb_build_object(
    'ok', true,
    'has_pin', v_row.user_id IS NOT NULL,
    'locked_until', v_row.locked_until,
    'failed_attempts', COALESCE(v_row.failed_attempts, 0)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.vault_set_pin(p_pin text, p_current_pin text DEFAULT NULL, p_reset_code text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.wallet_vault_pins%ROWTYPE;
  v_code public.vault_reset_codes%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'NOT_AUTHENTICATED');
  END IF;

  IF p_pin IS NULL OR p_pin !~ '^[0-9]{6}$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'INVALID_PIN', 'message', 'PIN must be exactly 6 digits.');
  END IF;

  IF p_pin IN ('000000','111111','222222','333333','444444','555555','666666','777777','888888','999999','123456','654321') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'WEAK_PIN', 'message', 'Please choose a less obvious PIN.');
  END IF;

  SELECT * INTO v_row FROM public.wallet_vault_pins WHERE user_id = v_uid;

  IF v_row.user_id IS NOT NULL THEN
    IF p_reset_code IS NOT NULL THEN
      SELECT * INTO v_code
      FROM public.vault_reset_codes
      WHERE user_id = v_uid AND used = false AND expires_at > now()
        AND code_hash = extensions.crypt(p_reset_code, code_hash)
      ORDER BY created_at DESC LIMIT 1;

      IF v_code.id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'INVALID_CODE', 'message', 'That reset code is wrong or has expired.');
      END IF;

      UPDATE public.vault_reset_codes SET used = true, used_at = now() WHERE id = v_code.id;
    ELSIF p_current_pin IS NOT NULL THEN
      IF v_row.pin_hash <> extensions.crypt(p_current_pin, v_row.pin_hash) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'WRONG_PIN', 'message', 'Your current PIN is wrong.');
      END IF;
    ELSE
      RETURN jsonb_build_object('ok', false, 'error', 'VERIFICATION_REQUIRED', 'message', 'Enter your current PIN or request a reset code.');
    END IF;

    UPDATE public.wallet_vault_pins
      SET pin_hash = extensions.crypt(p_pin, extensions.gen_salt('bf', 10)),
          failed_attempts = 0, locked_until = NULL, last_unlocked_at = now()
      WHERE user_id = v_uid;
  ELSE
    INSERT INTO public.wallet_vault_pins (user_id, pin_hash, last_unlocked_at)
    VALUES (v_uid, extensions.crypt(p_pin, extensions.gen_salt('bf', 10)), now());
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.vault_verify_pin(p_pin text)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.wallet_vault_pins%ROWTYPE;
  v_attempts integer;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'NOT_AUTHENTICATED');
  END IF;

  SELECT * INTO v_row FROM public.wallet_vault_pins WHERE user_id = v_uid;

  IF v_row.user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'NO_PIN', 'message', 'No vault PIN has been set yet.');
  END IF;

  IF v_row.locked_until IS NOT NULL AND v_row.locked_until > now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'LOCKED', 'locked_until', v_row.locked_until,
      'message', 'Too many wrong tries. Try again later.');
  END IF;

  IF v_row.pin_hash = extensions.crypt(p_pin, v_row.pin_hash) THEN
    UPDATE public.wallet_vault_pins
      SET failed_attempts = 0, locked_until = NULL, last_unlocked_at = now()
      WHERE user_id = v_uid;
    RETURN jsonb_build_object('ok', true);
  END IF;

  v_attempts := COALESCE(v_row.failed_attempts, 0) + 1;

  UPDATE public.wallet_vault_pins
    SET failed_attempts = v_attempts,
        locked_until = CASE WHEN v_attempts >= 5 THEN now() + interval '15 minutes' ELSE NULL END
    WHERE user_id = v_uid;

  IF v_attempts >= 5 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'LOCKED', 'locked_until', now() + interval '15 minutes',
      'message', 'Too many wrong tries. Your vault is locked for 15 minutes.');
  END IF;

  RETURN jsonb_build_object('ok', false, 'error', 'WRONG_PIN', 'attempts_left', 5 - v_attempts,
    'message', 'Wrong PIN. ' || (5 - v_attempts)::text || ' tries left.');
END;
$$;

REVOKE ALL ON FUNCTION public.vault_pin_status() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.vault_set_pin(text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.vault_verify_pin(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vault_pin_status() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.vault_set_pin(text, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.vault_verify_pin(text) TO authenticated, service_role;