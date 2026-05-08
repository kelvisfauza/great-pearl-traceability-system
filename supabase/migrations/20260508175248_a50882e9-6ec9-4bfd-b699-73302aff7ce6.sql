CREATE OR REPLACE FUNCTION public._diag_verify(_email text, _code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE rec RECORD; v_match boolean; v_crypt text;
BEGIN
  SELECT * INTO rec FROM public.email_verification_codes
   WHERE lower(email) = lower(trim(_email)) AND verified_at IS NULL
   ORDER BY created_at DESC LIMIT 1;
  v_crypt := extensions.crypt(trim(_code), rec.code);
  v_match := (rec.code = v_crypt);
  RETURN jsonb_build_object('id', rec.id, 'stored', rec.code, 'computed', v_crypt, 'match', v_match);
END $$;
GRANT EXECUTE ON FUNCTION public._diag_verify(text,text) TO anon, authenticated;