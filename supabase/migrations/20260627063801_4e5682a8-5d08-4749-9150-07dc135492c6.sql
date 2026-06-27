
DROP FUNCTION IF EXISTS public.verify_withdrawal_code(uuid, text);

CREATE OR REPLACE FUNCTION public.verify_withdrawal_code(_code_id uuid, _plaintext text)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  stored_hash text;
BEGIN
  SELECT verification_code INTO stored_hash
  FROM public.withdrawal_verification_codes WHERE id = _code_id;
  IF stored_hash IS NULL THEN RETURN false; END IF;
  RETURN stored_hash = crypt(_plaintext, stored_hash);
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_withdrawal_code(uuid, text) TO authenticated, service_role;
