CREATE OR REPLACE FUNCTION public.treasury_resolve_account(p_source text, p_meta_type text, p_entry_type text, p_amount numeric)
 RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path TO 'public'
AS $function$
DECLARE s TEXT := UPPER(COALESCE(p_source,'')); t TEXT := LOWER(COALESCE(p_meta_type,'')); e TEXT := UPPER(COALESCE(p_entry_type,''));
BEGIN
  IF t IN ('internal_transfer_credit','transfer_in_internal','reversal_mirror','wallet_transfer','wallet_transfer_out','wallet_transfer_in','wallet_transfer_reversal','transfer_reversal')
     OR s IN ('TRANSFER','TRANSFER_IN','TRANSFER_OUT','INTERNAL_TRANSFER','WALLET_TRANSFER','REVERSAL','REFUND') THEN
    RETURN NULL;
  END IF;
  IF p_amount > 0 THEN
    IF t LIKE '%fee_refund%' THEN RETURN 'fees_income'; END IF;
    IF t LIKE '%withdrawal_refund%' OR t LIKE '%withdraw_refund%' THEN RETURN NULL; END IF;
    IF t = 'absence_appeal_refund' THEN RETURN 'general'; END IF;
    IF t LIKE 'investment_%' OR s = 'INVEST_MATURITY' THEN RETURN 'invest_earn'; END IF;
    IF s IN ('SYSTEM_AWARD','LOYALTY','SELF_AWARD','MEETING_BONUS') OR e IN ('LOYALTY_REWARD','HOST_MEETING_BONUS','MEETING_ATTENDANCE_BONUS') THEN RETURN 'loyalty_fund'; END IF;
    IF s IN ('LOAN_DISBURSEMENT','LOAN_TOPUP_DISBURSEMENT','LOAN','OVERDRAFT_DRAW') OR e = 'LOAN_DISBURSEMENT' THEN RETURN 'loans_overdrafts'; END IF;
    IF s IN ('EXPENSE_CREDIT','EXPENSE','MEAL','PROVIDER','BUDGET_ALLOCATION','BUDGET_WITHDRAWAL','BUDGET_TRANSFER') OR t LIKE '%meal%' OR t LIKE '%provider%' OR t LIKE '%expense%' THEN RETURN 'operations'; END IF;
    IF s IN ('SALARY','BONUS','OVERTIME','OVERTIME_AWARD','ALLOWANCE','PER_DIEM','SALARY_ADVANCE','ADMIN_ADJUSTMENT','MANUAL_ADJUSTMENT') OR e IN ('MONTHLY_SALARY','BONUS','ADJUSTMENT') THEN RETURN 'general'; END IF;
    IF s IN ('SELF_DEPOSIT','TOPUP','DEPOSIT','BANK_DEPOSIT','MOMO_DEPOSIT','COLLECTION','MILLING_COLLECTION','EXTERNAL_DEPOSIT','CUSTOMER_PAYMENT')
       OR t LIKE '%deposit%' OR t LIKE '%topup%' OR t LIKE '%top_up%' OR t LIKE '%collection%' THEN
      RETURN NULL;
    END IF;
    RETURN 'general';
  ELSE
    -- Salary advances are paid from General, so wallet recoveries return there.
    IF t = 'salary_advance_recovery' THEN RETURN 'general'; END IF;
    IF t IN ('investment_lock','auto_salary_investment') OR s = 'INVESTMENT' THEN RETURN 'invest_earn'; END IF;
    IF s IN ('LOAN_INTEREST','OVERDRAFT_INTEREST','OVERDRAFT_FEE','OVERDRAFT_PENALTY','LOAN_PENALTY','STATEMENT_FEE') THEN RETURN 'profits'; END IF;
    IF s IN ('WITHDRAW_FEE','GOSENTE_FEE','FEE') OR t LIKE '%service_fee%' THEN RETURN 'fees_income'; END IF;
    IF s IN ('LOAN_REPAYMENT','OVERDRAFT_REPAY','OVERDRAFT_RECOVERY','SALARY_ADVANCE_REPAYMENT','SALARY_ADVANCE') OR e IN ('LOAN_REPAYMENT','LOAN_RECOVERY','ADVANCE_RECOVERY') THEN RETURN 'loans_overdrafts'; END IF;
    IF s IN ('SYSTEM_DEDUCTION','PENALTY','ADMIN_ADJUSTMENT','MANUAL_ADJUSTMENT') THEN RETURN 'general'; END IF;
    RETURN NULL;
  END IF;
END; $function$;

CREATE OR REPLACE FUNCTION public.salary_finance_boundary()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
 IF TG_OP='INSERT' AND lower(NEW.status) IN ('processing','approved','pending_finance') THEN
   NEW.status:='pending_finance'; NEW.payment_method:='wallet'; NEW.completed_at:=NULL; NEW.completed_by:=NULL;
   NEW.approved_at:=COALESCE(NEW.approved_at,now()); NEW.approved_by:=COALESCE(NEW.approved_by,NEW.processed_by); NEW.finance_released_at:=NULL; NEW.finance_released_by:=NULL; NEW.finance_ledger_id:=NULL;
 END IF;
 IF NEW.status='completed' AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM 'completed') THEN
   IF current_setting('payroll_release_private.active',true) IS DISTINCT FROM 'yes' OR NEW.finance_ledger_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.ledger_entries l WHERE l.id=NEW.finance_ledger_id AND l.reference='SAL-'||NEW.id::text AND l.source_category='SALARY' AND l.amount=NEW.net_salary) THEN RAISE EXCEPTION 'Finance must release this salary into the wallet before it can be completed'; END IF;
 END IF;
 IF TG_OP='UPDATE' AND OLD.status='completed' AND (NEW.net_salary IS DISTINCT FROM OLD.net_salary OR NEW.employee_email IS DISTINCT FROM OLD.employee_email OR NEW.status IS DISTINCT FROM OLD.status)
    AND NOT (current_setting('payroll_release_private.restate',true)='yes' AND NEW.employee_email=OLD.employee_email AND NEW.status=OLD.status) THEN
   RAISE EXCEPTION 'Paid salary records cannot be rewritten';
 END IF;
 RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION payroll_release_private.approve_salary_run_to_finance(p_run_id uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE r payroll_runs; e employees; row jsonb; adv numeric; n integer:=0;
BEGIN
 IF auth.uid() IS NULL OR NOT (is_current_user_admin() OR user_has_permission('Human Resources')) THEN RAISE EXCEPTION 'HR or administrator approval required'; END IF;
 SELECT * INTO e FROM employees WHERE lower(email)=lower(current_user_email()) AND disabled IS NOT TRUE LIMIT 1;
 IF e.id IS NULL THEN RAISE EXCEPTION 'Active staff account required'; END IF;
 SELECT * INTO r FROM payroll_runs WHERE id=p_run_id FOR UPDATE;
 IF r.id IS NULL OR r.status NOT IN ('pending_approval','approved') THEN RAISE EXCEPTION 'Payroll is not awaiting approval'; END IF;
 FOR row IN SELECT value FROM jsonb_array_elements(r.preview) LOOP
   PERFORM pg_advisory_xact_lock(hashtextextended(lower(row->>'email')||r.month,0));
   IF EXISTS(SELECT 1 FROM employee_salary_payments WHERE lower(employee_email)=lower(row->>'email') AND payment_month=r.month AND status IN ('pending_finance','processing','completed')) THEN CONTINUE; END IF;
   -- Planned advance recovery is recorded but taken from the wallet after the full salary lands.
   SELECT COALESCE(sum(least(minimum_payment,remaining_balance)),0) INTO adv FROM employee_salary_advances WHERE lower(employee_email)=lower(row->>'email') AND status='active' AND remaining_balance>0;
   INSERT INTO employee_salary_payments(employee_id,employee_name,employee_email,employee_phone,gross_salary,salary_amount,net_salary,nssf_employee,nssf_employer,nssf_total,taxable_income,paye,advance_deduction,time_deduction,payment_month,payment_label,payment_method,status,processed_by,processed_by_email,approved_by,approved_at,payroll_run_id)
   VALUES(row->>'employee_id',row->>'name',row->>'email',row->>'phone',(row->>'gross')::numeric,(row->>'gross')::numeric,greatest(0,(row->>'net')::numeric),(row->>'nssfEmployee')::numeric,(row->>'nssfEmployer')::numeric,(row->>'nssfTotal')::numeric,(row->>'taxableIncome')::numeric,(row->>'paye')::numeric,adv,0,r.month,'FULL SALARY','wallet','pending_finance',e.name,e.email,e.name,now(),r.id);
   n:=n+1;
 END LOOP;
 UPDATE payroll_runs SET status='approved',approved_by=e.name,approved_by_email=e.email,approved_at=COALESCE(approved_at,now()) WHERE id=r.id;
 RETURN jsonb_build_object('ok',true,'status','approved','queued',n);
END; $function$;

CREATE OR REPLACE FUNCTION payroll_release_private.release_one(p_id uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE p employee_salary_payments; e employees; a employee_salary_advances; remaining numeric; take_amount numeric; recovered numeric:=0; uid text; ledger_id uuid; stat record;
BEGIN
 IF auth.uid() IS NULL OR NOT public.can_process_finance() THEN RAISE EXCEPTION 'Finance approval required'; END IF;
 SELECT * INTO e FROM employees WHERE lower(email)=lower(current_user_email()) AND disabled IS NOT TRUE LIMIT 1;
 IF e.id IS NULL THEN RAISE EXCEPTION 'Active Finance account required'; END IF;
 SELECT * INTO p FROM employee_salary_payments WHERE id=p_id FOR UPDATE;
 IF p.id IS NULL THEN RAISE EXCEPTION 'Salary not found'; END IF;
 IF p.status='completed' THEN RETURN jsonb_build_object('ok',true,'already_paid',true,'payment_id',p.id); END IF;
 IF p.status NOT IN ('pending_finance','processing') THEN RAISE EXCEPTION 'Salary is not awaiting Finance'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(lower(p.employee_email)||p.payment_month,0));
 IF EXISTS(SELECT 1 FROM employee_salary_payments other WHERE other.id<>p.id AND lower(other.employee_email)=lower(p.employee_email) AND other.payment_month=p.payment_month AND other.status='completed' AND (other.payment_label=p.payment_label OR other.payment_label='FULL SALARY' OR p.payment_label='FULL SALARY')) THEN RAISE EXCEPTION 'This salary period has already been paid'; END IF;
 IF p.net_salary IS NULL OR p.net_salary<=0 THEN RAISE EXCEPTION 'Positive approved net salary required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM employees WHERE lower(email)=lower(p.employee_email) AND lower(status)='active') THEN RAISE EXCEPTION 'Employee is not active'; END IF;
 uid:=get_unified_user_id(p.employee_email);
 IF uid IS NULL OR uid='' THEN RAISE EXCEPTION 'Wallet identity unavailable'; END IF;
 IF EXISTS(SELECT 1 FROM salary_remittance_agreements WHERE lower(employee_email)=lower(p.employee_email) AND status='active') THEN RAISE EXCEPTION 'Active salary remittance agreement requires a separately reviewed split before wallet release'; END IF;
 -- 1. Full salary after NSSF and PAYE lands in the wallet.
 PERFORM set_config('payroll_release_private.active','yes',true);
 INSERT INTO ledger_entries(user_id,entry_type,source_category,amount,reference,metadata) VALUES(uid,'DEPOSIT','SALARY',p.net_salary,'SAL-'||p.id::text,jsonb_build_object('description','Salary - '||p.payment_month,'reference_type','salary_payment','reference_id',p.id,'performed_by',e.name,'wallet_credited',p.net_salary,'gross_salary',p.gross_salary,'nssf_employee',p.nssf_employee,'paye',p.paye,'treasury_account','general')) RETURNING id INTO ledger_id;
 UPDATE employee_salary_payments SET status='completed',payment_method='wallet',completed_at=now(),completed_by=e.name,finance_released_at=now(),finance_released_by=e.email,finance_ledger_id=ledger_id,transaction_id='SAL-'||p.id::text,disbursement_reference='SAL-'||p.id::text WHERE id=p.id;
 -- 2. Advances are then taken from the wallet as separate entries; a shortfall uses the normal overdraft.
 remaining:=COALESCE(p.advance_deduction,0);
 FOR a IN SELECT * FROM employee_salary_advances WHERE lower(employee_email)=lower(p.employee_email) AND status='active' AND remaining_balance>0 ORDER BY created_at FOR UPDATE LOOP
   EXIT WHEN remaining<=0; take_amount:=least(remaining,a.remaining_balance);
   UPDATE employee_salary_advances SET remaining_balance=remaining_balance-take_amount,status=CASE WHEN remaining_balance-take_amount<=0 THEN 'paid_off' ELSE 'active' END WHERE id=a.id;
   INSERT INTO salary_advance_payments(advance_id,employee_email,amount_paid,status,approved_by) VALUES(a.id,p.employee_email,take_amount,'approved',e.name);
   INSERT INTO ledger_entries(user_id,entry_type,source_category,amount,reference,metadata) VALUES(uid,'WITHDRAWAL','SALARY_ADVANCE',-take_amount,'SALADV-'||p.id::text||'-'||a.id::text,jsonb_build_object('description','Salary advance recovery - '||p.payment_month||COALESCE(' ('||a.reason||')',''),'type','salary_advance_recovery','reference_type','salary_payment','reference_id',p.id,'advance_id',a.id,'performed_by',e.name));
   remaining:=remaining-take_amount; recovered:=recovered+take_amount;
 END LOOP;
 IF recovered<>COALESCE(p.advance_deduction,0) THEN UPDATE employee_salary_payments SET advance_deduction=recovered WHERE id=p.id; END IF;
 FOR stat IN SELECT * FROM (VALUES('nssf_employee',p.nssf_employee),('nssf_employer',p.nssf_employer),('paye',p.paye)) AS x(kind,amount) WHERE amount>0 LOOP
   INSERT INTO statutory_liabilities(payroll_run_id,salary_payment_id,employee_id,employee_name,employee_email,month,type,amount,status) VALUES(p.payroll_run_id,p.id,p.employee_id,p.employee_name,p.employee_email,p.payment_month,stat.kind,stat.amount,'pending');
 END LOOP;
 IF p.time_deduction>0 THEN UPDATE time_deductions SET deducted_in_payment_id=p.id WHERE employee_id=(SELECT id FROM employees WHERE lower(email)=lower(p.employee_email) LIMIT 1) AND month=to_char(to_date(p.payment_month,'FMMonth YYYY'),'YYYY-MM') AND deducted_in_payment_id IS NULL; END IF;
 IF p.payroll_run_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM employee_salary_payments WHERE payroll_run_id=p.payroll_run_id AND status<>'completed') THEN UPDATE payroll_runs SET status='disbursed',disbursed_at=now() WHERE id=p.payroll_run_id; END IF;
 PERFORM net.http_post(url:='https://pudfybkyfedeggmokhco.supabase.co/functions/v1/send-payroll-payment-emails',headers:=private_edge.header()||'{"Content-Type":"application/json"}'::jsonb,body:=jsonb_build_object('paymentIds',jsonb_build_array(p.id)),timeout_milliseconds:=60000);
 RETURN jsonb_build_object('ok',true,'payment_id',p.id,'ledger_id',ledger_id,'amount',p.net_salary,'advance_recovered',recovered);
END; $function$;