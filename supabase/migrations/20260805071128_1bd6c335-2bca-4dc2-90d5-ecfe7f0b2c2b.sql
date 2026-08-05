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
BEGIN
  v_clean := upper(btrim(coalesce(p_code, '')));
  v_clean := regexp_replace(v_clean, '^GAC-', '');
  v_clean := regexp_replace(v_clean, '^GRN-DISC-', '');
  v_clean := regexp_replace(v_clean, '^GRN-', '');

  IF v_clean = '' THEN
    RETURN NULL;
  END IF;

  -- Document verification code (e.g. GPCF-DOC-2026-HWJ5SM) -> stored GRN reference
  IF v_clean ~ '^GPCF-[A-Z]{2,3}-[0-9]{4}-[A-Z0-9]{4,10}$' THEN
    SELECT reference_no INTO v_ref
    FROM public.verifications
    WHERE upper(code) = v_clean
    LIMIT 1;

    IF v_ref IS NOT NULL THEN
      v_ref := regexp_replace(regexp_replace(regexp_replace(upper(btrim(v_ref)), '^GAC-', ''), '^GRN-DISC-', ''), '^GRN-', '');
      RETURN v_ref;
    END IF;
    RETURN NULL;
  END IF;

  RETURN v_clean;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_grn_reference(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_grn_reference(text) TO anon;