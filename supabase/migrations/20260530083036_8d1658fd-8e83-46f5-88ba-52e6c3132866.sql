
-- 1) Drop the overly-broad self-update policy
DROP POLICY IF EXISTS "Employees can update own bank details" ON public.employees;

-- 2) Create a SECURITY DEFINER RPC that only updates safe profile columns
CREATE OR REPLACE FUNCTION public.update_own_employee_profile(
  _national_id_name text DEFAULT NULL,
  _national_id_number text DEFAULT NULL,
  _date_of_birth date DEFAULT NULL,
  _gender text DEFAULT NULL,
  _marital_status text DEFAULT NULL,
  _tribe text DEFAULT NULL,
  _district text DEFAULT NULL,
  _phone text DEFAULT NULL,
  _address text DEFAULT NULL,
  _next_of_kin_name text DEFAULT NULL,
  _next_of_kin_phone text DEFAULT NULL,
  _next_of_kin_relationship text DEFAULT NULL,
  _emergency_contact text DEFAULT NULL,
  _account_number text DEFAULT NULL,
  _bank_name text DEFAULT NULL,
  _account_name text DEFAULT NULL,
  _bank_phone text DEFAULT NULL,
  _bank_email text DEFAULT NULL,
  _avatar_url text DEFAULT NULL,
  _profile_completed boolean DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_rows int;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  UPDATE public.employees SET
    national_id_name = COALESCE(_national_id_name, national_id_name),
    national_id_number = COALESCE(_national_id_number, national_id_number),
    date_of_birth = COALESCE(_date_of_birth, date_of_birth),
    gender = COALESCE(_gender, gender),
    marital_status = COALESCE(_marital_status, marital_status),
    tribe = COALESCE(_tribe, tribe),
    district = COALESCE(_district, district),
    phone = COALESCE(_phone, phone),
    address = COALESCE(_address, address),
    next_of_kin_name = COALESCE(_next_of_kin_name, next_of_kin_name),
    next_of_kin_phone = COALESCE(_next_of_kin_phone, next_of_kin_phone),
    next_of_kin_relationship = COALESCE(_next_of_kin_relationship, next_of_kin_relationship),
    emergency_contact = COALESCE(_emergency_contact, emergency_contact),
    account_number = COALESCE(_account_number, account_number),
    bank_name = COALESCE(_bank_name, bank_name),
    account_name = COALESCE(_account_name, account_name),
    bank_phone = COALESCE(_bank_phone, bank_phone),
    bank_email = COALESCE(_bank_email, bank_email),
    avatar_url = COALESCE(_avatar_url, avatar_url),
    profile_completed = COALESCE(_profile_completed, profile_completed),
    updated_at = now()
  WHERE auth_user_id = v_uid;

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  IF v_rows = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_employee_row');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.update_own_employee_profile(
  text, text, date, text, text, text, text, text, text, text, text, text, text,
  text, text, text, text, text, text, boolean
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.update_own_employee_profile(
  text, text, date, text, text, text, text, text, text, text, text, text, text,
  text, text, text, text, text, text, boolean
) TO authenticated;
