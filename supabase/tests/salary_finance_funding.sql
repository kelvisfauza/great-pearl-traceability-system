BEGIN;
DO $$
DECLARE e employees; p uuid:=gen_random_uuid(); denied boolean:=false; before_adv numeric; after_adv numeric;
BEGIN
 SELECT * INTO e FROM employees WHERE lower(status)='active' AND disabled IS NOT TRUE AND auth_user_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM salary_remittance_agreements a WHERE lower(a.employee_email)=lower(employees.email) AND a.status='active') LIMIT 1;
 IF e.id IS NULL THEN RAISE EXCEPTION 'Test staff unavailable'; END IF;
 INSERT INTO employee_salary_payments(id,employee_id,employee_name,employee_email,gross_salary,salary_amount,net_salary,payment_month,payment_label,payment_method,status,processed_by,processed_by_email) VALUES(p,e.id::text,e.name,e.email,100,100,100,'December 2099','FULL SALARY','wallet','pending_finance','Rollback HR test','rollback@example.invalid');
 SELECT COALESCE(sum(remaining_balance),0) INTO before_adv FROM employee_salary_advances WHERE employee_email=e.email;
 UPDATE treasury_accounts SET balance=0 WHERE code='general';
 PERFORM set_config('request.jwt.claims','{"sub":"42f96d36-942d-4d63-8bd3-44f573bb1f37","role":"authenticated"}',true);
 BEGIN PERFORM public.finance_release_salary(p); EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE '%TREASURY_INSUFFICIENT%' THEN RAISE; END IF; denied:=true; END;
 IF NOT denied THEN RAISE EXCEPTION 'Unfunded salary was released'; END IF;
 IF EXISTS(SELECT 1 FROM ledger_entries WHERE reference='SAL-'||p::text) OR NOT EXISTS(SELECT 1 FROM employee_salary_payments WHERE id=p AND status='pending_finance') THEN RAISE EXCEPTION 'Failed release changed wallet or marked paid'; END IF;
 IF EXISTS(SELECT 1 FROM net.http_request_queue WHERE url LIKE '%send-payroll-payment-emails' AND convert_from(body,'UTF8') LIKE '%'||p::text||'%') THEN RAISE EXCEPTION 'Failed release queued salary email'; END IF;
 SELECT COALESCE(sum(remaining_balance),0) INTO after_adv FROM employee_salary_advances WHERE employee_email=e.email;
 IF before_adv<>after_adv THEN RAISE EXCEPTION 'Failed release changed advance balance'; END IF;
 RAISE NOTICE 'PASS: Insufficient General funds leave salary pending, wallet and advances unchanged, and no email queued';
END $$;
ROLLBACK;
