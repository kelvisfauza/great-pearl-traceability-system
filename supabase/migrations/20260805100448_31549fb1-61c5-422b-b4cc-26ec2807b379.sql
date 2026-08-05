-- Secure, non-sequential pay codes for GRNs
CREATE TABLE IF NOT EXISTS public.grn_pay_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number text NOT NULL UNIQUE,
  pay_code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.grn_pay_codes TO authenticated;
GRANT ALL ON public.grn_pay_codes TO service_role;

ALTER TABLE public.grn_pay_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read grn pay codes"
  ON public.grn_pay_codes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can create grn pay codes"
  ON public.grn_pay_codes FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Service role manages grn pay codes"
  ON public.grn_pay_codes FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER trg_grn_pay_codes_updated_at
  BEFORE UPDATE ON public.grn_pay_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Crockford-style alphabet without ambiguous characters (no I, L, O, U, 0, 1)
CREATE OR REPLACE FUNCTION public._grn_code_alphabet()
RETURNS text LANGUAGE sql IMMUTABLE AS $$ SELECT '23456789ABCDEFGHJKMNPQRSTVWXYZ'::text $$;

-- Check character over the 8 random characters (weighted mod-30)
CREATE OR REPLACE FUNCTION public._grn_code_check_char(p_body text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_alpha text := public._grn_code_alphabet();
  v_sum int := 0;
  v_pos int;
  v_idx int;
BEGIN
  FOR v_pos IN 1..length(p_body) LOOP
    v_idx := position(substr(p_body, v_pos, 1) in v_alpha);
    IF v_idx = 0 THEN
      RETURN NULL;
    END IF;
    v_sum := v_sum + (v_idx - 1) * (v_pos + 1);
  END LOOP;
  RETURN substr(v_alpha, (v_sum % length(v_alpha)) + 1, 1);
END;
$$;

-- TRUE when a code is structurally valid (so typos are rejected, not resolved)
CREATE OR REPLACE FUNCTION public.is_valid_grn_pay_code(p_code text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_clean text;
  v_body text;
BEGIN
  v_clean := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_clean := regexp_replace(v_clean, '^GAC', '');
  IF length(v_clean) <> 9 THEN
    RETURN false;
  END IF;
  v_body := substr(v_clean, 1, 8);
  RETURN public._grn_code_check_char(v_body) = substr(v_clean, 9, 1);
END;
$$;

CREATE OR REPLACE FUNCTION public.normalize_grn_pay_code(p_code text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT regexp_replace(upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g')), '^GAC', '')
$$;

-- Get (or lazily create) the immutable pay code for a GRN batch
CREATE OR REPLACE FUNCTION public.get_or_create_grn_pay_code(p_batch_number text)
RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alpha text := public._grn_code_alphabet();
  v_batch text;
  v_code text;
  v_body text;
  v_i int;
  v_try int := 0;
BEGIN
  v_batch := upper(btrim(coalesce(p_batch_number, '')));
  v_batch := regexp_replace(regexp_replace(regexp_replace(v_batch, '^GAC-', ''), '^GRN-DISC-', ''), '^GRN-', '');
  IF v_batch = '' THEN
    RETURN NULL;
  END IF;

  SELECT pay_code INTO v_code FROM public.grn_pay_codes WHERE batch_number = v_batch;
  IF v_code IS NOT NULL THEN
    RETURN v_code;
  END IF;

  LOOP
    v_try := v_try + 1;
    v_body := '';
    FOR v_i IN 1..8 LOOP
      v_body := v_body || substr(v_alpha, 1 + floor(random() * length(v_alpha))::int, 1);
    END LOOP;
    v_code := v_body || public._grn_code_check_char(v_body);

    BEGIN
      INSERT INTO public.grn_pay_codes (batch_number, pay_code) VALUES (v_batch, v_code);
      RETURN v_code;
    EXCEPTION
      WHEN unique_violation THEN
        SELECT pay_code INTO v_code FROM public.grn_pay_codes WHERE batch_number = v_batch;
        IF v_code IS NOT NULL THEN
          RETURN v_code;
        END IF;
        IF v_try > 10 THEN
          RAISE EXCEPTION 'Could not allocate a unique GRN pay code';
        END IF;
    END;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_grn_pay_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_valid_grn_pay_code(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.normalize_grn_pay_code(text) TO authenticated, anon;

-- Resolver now understands pay codes first, then legacy references
CREATE OR REPLACE FUNCTION public.resolve_grn_reference(p_code text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref text;
  v_clean text;
  v_norm text;
BEGIN
  v_clean := upper(btrim(coalesce(p_code, '')));
  v_clean := regexp_replace(v_clean, '^GAC-', '');
  v_clean := regexp_replace(v_clean, '^GRN-DISC-', '');
  v_clean := regexp_replace(v_clean, '^GRN-', '');

  IF v_clean = '' THEN
    RETURN NULL;
  END IF;

  -- Secure pay code (letters present, 9 chars after stripping separators)
  v_norm := public.normalize_grn_pay_code(p_code);
  IF length(v_norm) = 9 AND v_norm ~ '[A-Z]' THEN
    IF NOT public.is_valid_grn_pay_code(v_norm) THEN
      RETURN NULL; -- mistyped code: never fall through to another GRN
    END IF;
    SELECT batch_number INTO v_ref FROM public.grn_pay_codes WHERE pay_code = v_norm;
    RETURN v_ref;
  END IF;

  -- Document verification code (e.g. GPCF-DOC-2026-HWJ5SM) -> stored GRN reference
  IF v_clean ~ '^GPCF-[A-Z]{2,3}-[0-9]{4}-[A-Z0-9]{4,10}$' THEN
    SELECT reference_no INTO v_ref
    FROM public.verifications
    WHERE upper(code) = v_clean
    LIMIT 1;

    IF v_ref IS NOT NULL THEN
      v_ref := regexp_replace(regexp_replace(regexp_replace(upper(btrim(v_ref)), '^GAC-', ''), '^GRN-', ''), '^GRN-DISC-', '');
      RETURN v_ref;
    END IF;
    RETURN NULL;
  END IF;

  RETURN v_clean;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_grn_reference(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_grn_reference(text) TO anon;