CREATE OR REPLACE FUNCTION public.hash_maintenance_credentials()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $function$
BEGIN
 IF NEW.recovery_key IS NOT NULL AND NEW.recovery_key !~ '^\$2[aby]\$' THEN
  NEW.recovery_key := extensions.crypt(NEW.recovery_key, extensions.gen_salt('bf'));
 END IF;
 IF NEW.recovery_pin IS NOT NULL AND NEW.recovery_pin !~ '^\$2[aby]\$' THEN
  NEW.recovery_pin := extensions.crypt(NEW.recovery_pin, extensions.gen_salt('bf'));
 END IF;
 RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION public.verify_and_deactivate_maintenance(_code text, _pin text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $function$
DECLARE rec record; code_ok boolean := false; pin_ok boolean := false;
BEGIN
 SELECT id,recovery_key,recovery_pin INTO rec FROM public.system_maintenance
 WHERE is_active=true ORDER BY updated_at DESC,created_at DESC LIMIT 1;
 IF rec IS NULL THEN
  SELECT id,recovery_key,recovery_pin INTO rec FROM public.system_maintenance
  WHERE recovery_key IS NOT NULL AND recovery_pin IS NOT NULL ORDER BY updated_at DESC,created_at DESC LIMIT 1;
 END IF;
 IF rec IS NULL OR rec.recovery_key IS NULL OR rec.recovery_pin IS NULL THEN RETURN false; END IF;
 IF rec.recovery_key ~ '^\$2[aby]\$' THEN code_ok:=rec.recovery_key=extensions.crypt(_code,rec.recovery_key);
 ELSE code_ok:=rec.recovery_key=_code; END IF;
 IF rec.recovery_pin ~ '^\$2[aby]\$' THEN pin_ok:=rec.recovery_pin=extensions.crypt(_pin,rec.recovery_pin);
 ELSE pin_ok:=rec.recovery_pin=_pin; END IF;
 IF NOT (code_ok AND pin_ok) THEN RETURN false; END IF;
 UPDATE public.system_maintenance SET is_active=false,reason=NULL,activated_by=NULL,activated_at=NULL,
 recovery_key=NULL,recovery_pin=NULL,expected_back_online=NULL WHERE id=rec.id;
 RETURN true;
END;
$function$;