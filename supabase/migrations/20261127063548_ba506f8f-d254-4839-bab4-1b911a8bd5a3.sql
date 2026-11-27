DO $m$ DECLARE d text; BEGIN
 SELECT pg_get_functiondef('payroll_release_private.release_one(uuid)'::regprocedure) INTO d;
 IF position('AND disabled IS NOT TRUE AND lower(status)=''active''' in d)=0 THEN RAISE EXCEPTION 'pattern not found'; END IF;
 EXECUTE replace(d,'AND disabled IS NOT TRUE AND lower(status)=''active''','AND lower(status)=''active''');
END $m$;