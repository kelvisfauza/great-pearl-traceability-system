BEGIN;
DO $$
DECLARE e employees; run_id uuid:=gen_random_uuid(); result jsonb;
BEGIN
 SELECT * INTO e FROM employees WHERE lower(status)='active' AND disabled IS NOT TRUE AND auth_user_id IS NOT NULL LIMIT 1;
 IF e.id IS NULL THEN RAISE EXCEPTION 'Test employee unavailable'; END IF;
 INSERT INTO payroll_runs(id,month,status,preview,total_gross,total_net,employee_count) VALUES(run_id,'December 2099','pending_approval',jsonb_build_array(jsonb_build_object('employee_id',e.id,'name',e.name,'email',e.email,'gross',100,'net',100,'nssfEmployee',0,'nssfEmployer',0,'nssfTotal',0,'taxableIncome',100,'paye',0)),100,100,1);
 PERFORM set_config('request.jwt.claims','{"sub":"42f96d36-942d-4d63-8bd3-44f573bb1f37","role":"authenticated"}',true);
 result:=public.approve_salary_run_to_finance(run_id);
 IF result->>'ok'<>'true' OR (result->>'queued')::integer<>1 THEN RAISE EXCEPTION 'HR approval did not stage one employee: %',result; END IF;
 IF NOT EXISTS(SELECT 1 FROM employee_salary_payments WHERE payroll_run_id=run_id AND status='pending_finance' AND completed_at IS NULL) THEN RAISE EXCEPTION 'HR salary did not await Finance'; END IF;
 IF EXISTS(SELECT 1 FROM ledger_entries WHERE metadata->>'reference_id' IN (SELECT id::text FROM employee_salary_payments WHERE payroll_run_id=run_id)) THEN RAISE EXCEPTION 'HR approval credited wallet'; END IF;
 result:=public.approve_salary_run_to_finance(run_id);
 IF (result->>'queued')::integer<>0 THEN RAISE EXCEPTION 'Repeated HR approval queued duplicate employee'; END IF;
 RAISE NOTICE 'PASS: HR approved payroll queues one saved salary, creates no wallet credit and is idempotent';
END $$;
ROLLBACK;
