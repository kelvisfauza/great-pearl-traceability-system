BEGIN;
DO $$
DECLARE e public.employees; p uuid:=gen_random_uuid(); result jsonb; before_count integer; before_balance numeric; after_balance numeric; denied boolean:=false;
BEGIN
 SELECT * INTO e FROM public.employees WHERE lower(status)='active' AND disabled IS NOT TRUE AND auth_user_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM salary_remittance_agreements a WHERE lower(a.employee_email)=lower(employees.email) AND a.status='active') LIMIT 1;
 IF e.id IS NULL THEN RAISE EXCEPTION 'No eligible employee for rollback test'; END IF;
 SELECT count(*) INTO before_count FROM public.ledger_entries WHERE reference='SAL-'||p::text;
 INSERT INTO public.employee_salary_payments(id,employee_id,employee_name,employee_email,gross_salary,salary_amount,net_salary,payment_month,payment_label,payment_method,status,processed_by)
 VALUES(p,e.id::text,e.name,e.email,100,100,100,'December 2099','FULL SALARY','wallet','processing','Rollback HR test');
 IF NOT EXISTS(SELECT 1 FROM employee_salary_payments WHERE id=p AND status='pending_finance' AND completed_at IS NULL) THEN RAISE EXCEPTION 'HR did not queue salary'; END IF;
 IF (SELECT count(*) FROM ledger_entries WHERE reference='SAL-'||p::text)<>before_count THEN RAISE EXCEPTION 'HR approval credited the wallet early'; END IF;
 BEGIN UPDATE employee_salary_payments SET status='completed' WHERE id=p; EXCEPTION WHEN OTHERS THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'HR completion bypass was allowed'; END IF;
 PERFORM set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000000","role":"authenticated"}',true);
 denied:=false;
 BEGIN PERFORM public.finance_release_salary(p); EXCEPTION WHEN OTHERS THEN denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Unprivileged release was allowed'; END IF;
 PERFORM set_config('request.jwt.claims','{"sub":"42f96d36-942d-4d63-8bd3-44f573bb1f37","role":"authenticated"}',true);
 SELECT balance INTO before_balance FROM treasury_accounts WHERE code='general';
 result:=public.finance_release_salary(p);
 IF result->>'ok'<>'true' THEN RAISE EXCEPTION 'Finance release failed: %',result; END IF;
 IF NOT EXISTS(SELECT 1 FROM employee_salary_payments s JOIN ledger_entries l ON l.id=s.finance_ledger_id WHERE s.id=p AND s.status='completed' AND l.amount=100 AND l.reference='SAL-'||p::text) THEN RAISE EXCEPTION 'Wallet credit and paid status not bound'; END IF;
 SELECT balance INTO after_balance FROM treasury_accounts WHERE code='general';
 IF before_balance-after_balance<>100 THEN RAISE EXCEPTION 'Salary did not draw exactly UGX 100 from General'; END IF;
 result:=public.finance_release_salary(p);
 IF result->>'already_paid'<>'true' OR (SELECT count(*) FROM ledger_entries WHERE reference='SAL-'||p::text)<>1 THEN RAISE EXCEPTION 'Duplicate wallet credit'; END IF;
 RAISE NOTICE 'PASS: HR queues, early completion denied, unauthorized release denied, Finance atomic wallet credit and General debit, duplicate prevented';
END $$;
ROLLBACK;
