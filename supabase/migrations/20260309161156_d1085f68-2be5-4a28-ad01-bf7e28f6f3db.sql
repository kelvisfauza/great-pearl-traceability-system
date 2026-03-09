-- Fix SECURITY DEFINER functions: add SET search_path = public, pg_temp

-- 1. cleanup_old_price_calculations
CREATE OR REPLACE FUNCTION public.cleanup_old_price_calculations()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
BEGIN
  DELETE FROM public.price_calculation_history
  WHERE calculated_at < NOW() - INTERVAL '30 days';
END;
$function$;

-- 2. check_unread_messages_for_sms
CREATE OR REPLACE FUNCTION public.check_unread_messages_for_sms()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
BEGIN
  RETURN;
END;
$function$;

-- 3. process_withdrawal_approval
CREATE OR REPLACE FUNCTION public.process_withdrawal_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
BEGIN
IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
IF NOT EXISTS (
SELECT 1 FROM ledger_entries 
WHERE reference = 'WITHDRAWAL-' || NEW.id
) THEN
INSERT INTO ledger_entries (
user_id, entry_type, amount, reference, metadata, created_at
) VALUES (
NEW.user_id, 'WITHDRAWAL', -NEW.amount, 'WITHDRAWAL-' || NEW.id,
json_build_object('withdrawal_id', NEW.id, 'phone_number', NEW.phone_number, 'approved_by', NEW.approved_by),
now()
);
END IF;
END IF;
RETURN NEW;
END;
$function$;

-- 4. cleanup_inactive_sessions
CREATE OR REPLACE FUNCTION public.cleanup_inactive_sessions()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
BEGIN
  UPDATE public.user_sessions SET is_active = false WHERE last_activity < now() - INTERVAL '24 hours' AND is_active = true;
  DELETE FROM public.user_sessions WHERE created_at < now() - INTERVAL '7 days' AND is_active = false;
END;
$function$;

-- 5. invalidate_other_sessions
CREATE OR REPLACE FUNCTION public.invalidate_other_sessions(p_user_id uuid, p_current_session_token text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
BEGIN
  UPDATE public.user_sessions SET is_active = false WHERE user_id = p_user_id AND session_token != p_current_session_token AND is_active = true;
END;
$function$;

-- 6. process_money_request_two_step_approval
CREATE OR REPLACE FUNCTION public.process_money_request_two_step_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' AND 
     NEW.finance_approved_at IS NOT NULL AND 
     NEW.admin_approved_at IS NOT NULL THEN
    INSERT INTO public.user_accounts (user_id, current_balance, salary_approved)
    VALUES (NEW.user_id, NEW.amount, NEW.amount)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      current_balance = user_accounts.current_balance + NEW.amount,
      salary_approved = user_accounts.salary_approved + NEW.amount,
      updated_at = now();
    IF NEW.payment_slip_number IS NULL THEN
      NEW.payment_slip_number = 'PS' || TO_CHAR(now(), 'YYYYMMDD') || '-' || LPAD(NEW.id::text, 8, '0');
      NEW.payment_slip_generated = true;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- 7. cleanup_expired_login_codes
CREATE OR REPLACE FUNCTION public.cleanup_expired_login_codes()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
BEGIN
DELETE FROM login_verification_codes WHERE expires_at < now() - interval '1 hour';
END;
$function$;

-- 8. process_money_request_three_tier_approval
CREATE OR REPLACE FUNCTION public.process_money_request_three_tier_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
BEGIN
  IF NEW.status IN ('Withdrawn', 'Rejected') THEN
    RETURN NEW;
  END IF;
  IF NEW.amount > 50000 THEN
    NEW.requires_three_approvals := true;
  ELSE
    NEW.requires_three_approvals := false;
  END IF;
  IF NEW.requires_three_approvals THEN
    IF NEW.finance_approved_at IS NOT NULL AND 
       NEW.admin_approved_1_at IS NOT NULL AND 
       NEW.admin_approved_2_at IS NOT NULL AND
       (OLD IS NULL OR OLD.status IS NULL OR OLD.status != 'Approved') THEN
      NEW.status := 'Approved';
    END IF;
  ELSE
    IF NEW.finance_approved_at IS NOT NULL AND 
       NEW.admin_approved_at IS NOT NULL AND
       (OLD IS NULL OR OLD.status IS NULL OR OLD.status != 'Approved') THEN
      NEW.status := 'Approved';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- 9. save_price_history
CREATE OR REPLACE FUNCTION public.save_price_history()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
BEGIN
  INSERT INTO price_history (
    price_date, arabica_outturn, arabica_moisture, arabica_fm, arabica_buying_price,
    robusta_outturn, robusta_moisture, robusta_fm, robusta_buying_price,
    ice_arabica, robusta_international, exchange_rate,
    drugar_local, wugar_local, robusta_faq_local, recorded_by
  ) VALUES (
    CURRENT_DATE, NEW.arabica_outturn, NEW.arabica_moisture, NEW.arabica_fm, NEW.arabica_buying_price,
    NEW.robusta_outturn, NEW.robusta_moisture, NEW.robusta_fm, NEW.robusta_buying_price,
    NEW.ice_arabica, NEW.robusta, NEW.exchange_rate,
    NEW.drugar_local, NEW.wugar_local, NEW.robusta_faq_local, 'system'
  )
  ON CONFLICT (price_date) DO UPDATE SET
    arabica_outturn = EXCLUDED.arabica_outturn, arabica_moisture = EXCLUDED.arabica_moisture,
    arabica_fm = EXCLUDED.arabica_fm, arabica_buying_price = EXCLUDED.arabica_buying_price,
    robusta_outturn = EXCLUDED.robusta_outturn, robusta_moisture = EXCLUDED.robusta_moisture,
    robusta_fm = EXCLUDED.robusta_fm, robusta_buying_price = EXCLUDED.robusta_buying_price,
    ice_arabica = EXCLUDED.ice_arabica, robusta_international = EXCLUDED.robusta_international,
    exchange_rate = EXCLUDED.exchange_rate, drugar_local = EXCLUDED.drugar_local,
    wugar_local = EXCLUDED.wugar_local, robusta_faq_local = EXCLUDED.robusta_faq_local;
  RETURN NEW;
END;
$function$;

-- 10. sync_employee_to_firebase
CREATE OR REPLACE FUNCTION public.sync_employee_to_firebase()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
BEGIN
  INSERT INTO public.audit_logs (action, table_name, record_id, reason, performed_by, department, record_data)
  VALUES (
    CASE WHEN TG_OP = 'INSERT' THEN 'supabase_employee_created'
         WHEN TG_OP = 'UPDATE' THEN 'supabase_employee_updated'
         WHEN TG_OP = 'DELETE' THEN 'supabase_employee_deleted' END,
    'employees', COALESCE(NEW.id::text, OLD.id::text),
    'Employee data changed in Supabase - needs Firebase sync',
    COALESCE(NEW.email, OLD.email, 'System'), 'HR',
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END
  );
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- 11. execute_approved_deletion
CREATE OR REPLACE FUNCTION public.execute_approved_deletion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  has_paid_payment BOOLEAN := false;
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    IF NEW.table_name = 'coffee_records' THEN
      SELECT EXISTS (
        SELECT 1 FROM public.payment_records 
        WHERE batch_number IN (SELECT batch_number FROM public.coffee_records WHERE id = NEW.record_id::uuid)
        AND status IN ('Paid', 'paid', 'completed', 'Completed')
      ) INTO has_paid_payment;
      IF has_paid_payment THEN
        UPDATE public.deletion_requests SET status = 'rejected',
          admin_comments = 'Cannot delete: Payment has already been made for this record',
          reviewed_at = now(), reviewed_by = COALESCE(NEW.reviewed_by, 'System')
        WHERE id = NEW.id;
        RETURN NEW;
      END IF;
      DELETE FROM public.finance_coffee_lots WHERE coffee_record_id = NEW.record_id::uuid;
      DELETE FROM public.payment_records WHERE batch_number IN (SELECT batch_number FROM public.coffee_records WHERE id = NEW.record_id::uuid);
      DELETE FROM public.quality_assessments WHERE store_record_id = NEW.record_id::uuid;
      DELETE FROM public.coffee_records WHERE id = NEW.record_id::uuid;
      INSERT INTO public.audit_logs (action, table_name, record_id, reason, performed_by, department, record_data)
      VALUES ('cascade_delete', 'related_records', NEW.record_id, 'Cascaded deletion due to coffee record deletion',
        COALESCE(NEW.reviewed_by, 'System'), 'Admin',
        jsonb_build_object('parent_table', 'coffee_records', 'parent_id', NEW.record_id));
    ELSE
      IF NEW.table_name = 'suppliers' THEN
        DELETE FROM public.contract_approvals WHERE contract_id IN (SELECT id FROM public.supplier_contracts WHERE supplier_id::text = NEW.record_id);
        DELETE FROM public.supplier_contracts WHERE supplier_id::text = NEW.record_id;
      END IF;
      BEGIN
        EXECUTE format('DELETE FROM public.%I WHERE id = $1', NEW.table_name) USING NEW.record_id::uuid;
      EXCEPTION WHEN invalid_text_representation THEN
        EXECUTE format('DELETE FROM public.%I WHERE id = $1', NEW.table_name) USING NEW.record_id;
      END;
    END IF;
    INSERT INTO public.audit_logs (action, table_name, record_id, reason, performed_by, department, record_data)
    VALUES ('admin_approved_delete', NEW.table_name, NEW.record_id, NEW.reason, COALESCE(NEW.reviewed_by, 'System'), 'Admin', NEW.record_data);
  END IF;
  RETURN NEW;
END;
$function$;

-- 12. refresh_current_week_allowances
CREATE OR REPLACE FUNCTION public.refresh_current_week_allowances()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  week_start DATE;
  week_end DATE;
  employee_record RECORD;
  days_count INTEGER;
  daily_rate NUMERIC := 2500;
  processed_count INTEGER := 0;
BEGIN
  week_start := CURRENT_DATE - ((EXTRACT(ISODOW FROM CURRENT_DATE)::INTEGER - 1) || ' days')::INTERVAL;
  week_end := week_start + INTERVAL '5 days';
  FOR employee_record IN 
    SELECT DISTINCT employee_id, employee_name, employee_email
    FROM attendance WHERE date >= week_start AND date <= week_end
  LOOP
    SELECT COUNT(*) INTO days_count FROM attendance
    WHERE employee_id = employee_record.employee_id AND date >= week_start AND date <= week_end
      AND status = 'present' AND EXTRACT(ISODOW FROM date) BETWEEN 1 AND 6;
    INSERT INTO weekly_allowances (employee_id, employee_name, employee_email, week_start_date, week_end_date,
      days_attended, total_eligible_amount, balance_available, amount_requested, updated_at)
    VALUES (employee_record.employee_id, employee_record.employee_name, employee_record.employee_email,
      week_start, week_end, days_count, days_count * daily_rate, days_count * daily_rate, 0, now())
    ON CONFLICT (employee_id, week_start_date) DO UPDATE SET
      days_attended = days_count, total_eligible_amount = days_count * daily_rate,
      balance_available = days_count * daily_rate - weekly_allowances.amount_requested, updated_at = now();
    processed_count := processed_count + 1;
  END LOOP;
  RETURN json_build_object('success', true, 'message', 'Current week allowances refreshed',
    'week_start', week_start, 'week_end', week_end, 'processed_count', processed_count);
END;
$function$;

-- 13. handle_finance_cash_transaction_changes
CREATE OR REPLACE FUNCTION public.handle_finance_cash_transaction_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
v_current_balance numeric;
v_last_confirmed_balance numeric;
BEGIN
SELECT current_balance INTO v_current_balance FROM finance_cash_balance WHERE singleton = true LIMIT 1;
IF v_current_balance IS NULL THEN
v_current_balance := 0;
INSERT INTO finance_cash_balance (current_balance, updated_by, singleton) VALUES (0, COALESCE(NEW.created_by, 'system'), true) ON CONFLICT (singleton) DO NOTHING;
END IF;
IF TG_OP = 'INSERT' THEN
NEW.balance_after := v_current_balance + NEW.amount;
IF NEW.status = 'confirmed' THEN
UPDATE finance_cash_balance SET current_balance = NEW.balance_after, last_updated = now(), updated_by = NEW.created_by WHERE singleton = true;
END IF;
RETURN NEW;
END IF;
IF TG_OP = 'UPDATE' THEN
IF OLD.status = 'pending' AND NEW.status = 'confirmed' THEN
SELECT COALESCE((SELECT balance_after FROM finance_cash_transactions WHERE status = 'confirmed' AND created_at < NEW.created_at ORDER BY created_at DESC LIMIT 1), 0) INTO v_last_confirmed_balance;
NEW.balance_after := v_last_confirmed_balance + NEW.amount;
NEW.confirmed_at := now();
UPDATE finance_cash_balance SET current_balance = NEW.balance_after, last_updated = now(), updated_by = COALESCE(NEW.confirmed_by, NEW.created_by) WHERE singleton = true;
END IF;
RETURN NEW;
END IF;
RETURN NEW;
END;
$function$;

-- 14. sync_unlinked_coffee_to_batches
CREATE OR REPLACE FUNCTION public.sync_unlinked_coffee_to_batches(p_coffee_type text DEFAULT NULL::text)
 RETURNS TABLE(batches_created integer, records_linked integer, total_kg numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_batch_capacity NUMERIC := 5000;
  v_record RECORD;
  v_current_batch_id UUID := NULL;
  v_current_batch_kg NUMERIC := 0;
  v_batch_count INT := 0;
  v_record_count INT := 0;
  v_total_kg NUMERIC := 0;
  v_batch_code TEXT;
  v_prefix TEXT;
  v_next_num INT;
  v_normalized_type TEXT;
BEGIN
  FOR v_record IN
    SELECT cr.id, cr.coffee_type, cr.kilograms, cr.supplier_name, cr.date, cr.created_at
    FROM coffee_records cr
    WHERE cr.status = 'inventory' AND cr.kilograms > 0
      AND (p_coffee_type IS NULL OR LOWER(cr.coffee_type) = LOWER(p_coffee_type))
      AND cr.id NOT IN (SELECT coffee_record_id FROM inventory_batch_sources)
    ORDER BY cr.created_at ASC
  LOOP
    v_normalized_type := INITCAP(LOWER(v_record.coffee_type));
    IF v_current_batch_id IS NULL OR v_current_batch_kg >= v_batch_capacity THEN
      IF v_current_batch_id IS NOT NULL THEN
        UPDATE inventory_batches SET status = 'active' WHERE id = v_current_batch_id;
      END IF;
      v_prefix := UPPER(SUBSTRING(v_normalized_type FROM 1 FOR 3));
      SELECT COALESCE(MAX(
        CASE WHEN bc.batch_code ~ (v_prefix || '-B\d+$') 
        THEN CAST(SUBSTRING(bc.batch_code FROM '-B(\d+)$') AS INT) ELSE 0 END
      ), 0) + 1 INTO v_next_num
      FROM inventory_batches bc WHERE bc.batch_code LIKE v_prefix || '-B%';
      v_batch_code := v_prefix || '-B' || LPAD(v_next_num::TEXT, 3, '0');
      INSERT INTO inventory_batches (batch_code, coffee_type, batch_date, status, total_kilograms, remaining_kilograms)
      VALUES (v_batch_code, v_normalized_type, COALESCE(v_record.date, CURRENT_DATE)::DATE, 'filling', 0, 0)
      RETURNING id INTO v_current_batch_id;
      v_current_batch_kg := 0;
      v_batch_count := v_batch_count + 1;
    END IF;
    INSERT INTO inventory_batch_sources (batch_id, coffee_record_id, kilograms, supplier_name, purchase_date)
    VALUES (v_current_batch_id, v_record.id, v_record.kilograms, v_record.supplier_name, COALESCE(v_record.date, CURRENT_DATE)::DATE);
    v_current_batch_kg := v_current_batch_kg + v_record.kilograms;
    UPDATE inventory_batches 
    SET total_kilograms = v_current_batch_kg, remaining_kilograms = v_current_batch_kg,
        status = CASE WHEN v_current_batch_kg >= v_batch_capacity THEN 'active' ELSE 'filling' END
    WHERE id = v_current_batch_id;
    v_record_count := v_record_count + 1;
    v_total_kg := v_total_kg + v_record.kilograms;
  END LOOP;
  batches_created := v_batch_count;
  records_linked := v_record_count;
  total_kg := v_total_kg;
  RETURN NEXT;
END;
$function$;

-- 15. create_withdrawal_verification_code
CREATE OR REPLACE FUNCTION public.create_withdrawal_verification_code(p_withdrawal_request_id uuid, p_approver_email text, p_approver_phone text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
v_code text;
v_code_id uuid;
v_expires_at timestamptz;
BEGIN
v_code := generate_verification_code();
v_expires_at := now() + interval '5 minutes';
INSERT INTO withdrawal_verification_codes (withdrawal_request_id, approver_email, approver_phone, verification_code, code_expires_at)
VALUES (p_withdrawal_request_id, p_approver_email, p_approver_phone, v_code, v_expires_at)
RETURNING id INTO v_code_id;
INSERT INTO withdrawal_approval_logs (withdrawal_request_id, approver_email, action, verification_method)
VALUES (p_withdrawal_request_id, p_approver_email, 'verification_sent', 'sms');
RETURN jsonb_build_object('code_id', v_code_id, 'code', v_code, 'phone', p_approver_phone, 'expires_at', v_expires_at);
END;
$function$;

-- 16. "great pearl" function
CREATE OR REPLACE FUNCTION public."great pearl"(conversation_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$SELECT EXISTS (
    SELECT 1 FROM conversation_participants 
    WHERE conversation_participants.conversation_id = $1 
    AND user_id = auth.uid()
  );$function$;

-- 17. bulk_deduct_unprocessed_sales
CREATE OR REPLACE FUNCTION public.bulk_deduct_unprocessed_sales(p_coffee_type text DEFAULT NULL::text)
 RETURNS TABLE(sales_processed integer, total_deducted numeric, sales_short integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_sale RECORD;
  v_processed INT := 0;
  v_total_deducted NUMERIC := 0;
  v_short INT := 0;
  v_deduction RECORD;
  v_sale_deducted NUMERIC;
BEGIN
  FOR v_sale IN
    SELECT st.id, st.customer, st.coffee_type, st.weight,
      st.weight - COALESCE((SELECT SUM(ABS(im.quantity_kg)) FROM inventory_movements im WHERE im.reference_id = st.id::text), 0) as remaining
    FROM sales_transactions st
    WHERE (p_coffee_type IS NULL OR LOWER(st.coffee_type) = LOWER(p_coffee_type))
      AND st.weight > COALESCE((SELECT SUM(ABS(im.quantity_kg)) FROM inventory_movements im WHERE im.reference_id = st.id::text), 0)
    ORDER BY st.date ASC, st.created_at ASC
  LOOP
    v_sale_deducted := 0;
    FOR v_deduction IN
      SELECT * FROM deduct_from_inventory_batches(v_sale.coffee_type, v_sale.remaining, v_sale.id, v_sale.customer)
    LOOP
      v_sale_deducted := v_sale_deducted + v_deduction.deducted_kg;
    END LOOP;
    v_total_deducted := v_total_deducted + v_sale_deducted;
    v_processed := v_processed + 1;
    IF v_sale_deducted < v_sale.remaining THEN
      v_short := v_short + 1;
    END IF;
  END LOOP;
  sales_processed := v_processed;
  total_deducted := v_total_deducted;
  sales_short := v_short;
  RETURN NEXT;
END;
$function$;

-- 18. deduct_from_inventory_batches
CREATE OR REPLACE FUNCTION public.deduct_from_inventory_batches(p_coffee_type text, p_quantity_kg numeric, p_sale_id uuid DEFAULT NULL::uuid, p_customer text DEFAULT NULL::text)
 RETURNS TABLE(batch_id uuid, batch_code text, deducted_kg numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  remaining_to_deduct NUMERIC := p_quantity_kg;
  batch_row RECORD;
  deduct_amount NUMERIC;
BEGIN
  FOR batch_row IN
    SELECT ib.id, ib.batch_code, ib.remaining_kilograms
    FROM inventory_batches ib
    WHERE LOWER(ib.coffee_type) = LOWER(p_coffee_type)
      AND ib.remaining_kilograms > 0
      AND ib.status IN ('active', 'filling', 'selling')
    ORDER BY ib.batch_code ASC
  LOOP
    EXIT WHEN remaining_to_deduct <= 0;
    deduct_amount := LEAST(batch_row.remaining_kilograms, remaining_to_deduct);
    UPDATE inventory_batches SET 
      remaining_kilograms = remaining_kilograms - deduct_amount,
      status = CASE WHEN remaining_kilograms - deduct_amount <= 0 THEN 'sold_out'
        WHEN status = 'active' OR status = 'filling' THEN 'selling' ELSE status END,
      sold_out_at = CASE WHEN remaining_kilograms - deduct_amount <= 0 THEN NOW() ELSE sold_out_at END,
      updated_at = NOW()
    WHERE id = batch_row.id;
    INSERT INTO inventory_movements (coffee_record_id, movement_type, quantity_kg, reference_type, reference_id, created_by, notes)
    VALUES (batch_row.id::TEXT, 'SALE', -deduct_amount, 'sale', COALESCE(p_sale_id::TEXT, 'manual'),
      'Sales Department', 'Sale to ' || COALESCE(p_customer, 'customer') || ' from batch ' || batch_row.batch_code);
    batch_id := batch_row.id;
    batch_code := batch_row.batch_code;
    deducted_kg := deduct_amount;
    RETURN NEXT;
    remaining_to_deduct := remaining_to_deduct - deduct_amount;
  END LOOP;
  RETURN;
END;
$function$;

-- 19. verify_withdrawal_code
CREATE OR REPLACE FUNCTION public.verify_withdrawal_code(p_code_id uuid, p_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
v_record RECORD;
v_valid boolean;
v_attempts_remaining integer;
BEGIN
SELECT * INTO v_record FROM withdrawal_verification_codes WHERE id = p_code_id FOR UPDATE;
IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Code not found'); END IF;
IF v_record.verified THEN RETURN jsonb_build_object('success', false, 'error', 'Code already used'); END IF;
IF v_record.attempts >= v_record.max_attempts THEN RETURN jsonb_build_object('success', false, 'error', 'Maximum attempts exceeded'); END IF;
IF v_record.code_expires_at < now() THEN RETURN jsonb_build_object('success', false, 'error', 'Code expired'); END IF;
UPDATE withdrawal_verification_codes SET attempts = attempts + 1 WHERE id = p_code_id;
v_valid := v_record.verification_code = p_code;
IF v_valid THEN
UPDATE withdrawal_verification_codes SET verified = true, verified_at = now() WHERE id = p_code_id;
INSERT INTO withdrawal_approval_logs (withdrawal_request_id, approver_email, action, verification_method)
VALUES (v_record.withdrawal_request_id, v_record.approver_email, 'verification_success', 'sms');
RETURN jsonb_build_object('success', true);
ELSE
v_attempts_remaining := v_record.max_attempts - (v_record.attempts + 1);
INSERT INTO withdrawal_approval_logs (withdrawal_request_id, approver_email, action, verification_method, details)
VALUES (v_record.withdrawal_request_id, v_record.approver_email, 'verification_failed', 'sms', jsonb_build_object('attempts', v_record.attempts + 1));
RETURN jsonb_build_object('success', false, 'error', 'Invalid code', 'attempts_remaining', v_attempts_remaining);
END IF;
END;
$function$;

-- 20. send_withdrawal_verification_sms_trigger
CREATE OR REPLACE FUNCTION public.send_withdrawal_verification_sms_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
v_supabase_url text;
v_service_role_key text;
v_function_url text;
v_employee_name text;
v_withdrawal_amount numeric;
BEGIN
v_supabase_url := current_setting('app.settings.supabase_url', true);
v_service_role_key := current_setting('app.settings.service_role_key', true);
IF v_supabase_url IS NULL THEN
v_supabase_url := 'https://wtsrcylnxgscswsyskzu.supabase.co';
END IF;
SELECT wr.amount, e.name INTO v_withdrawal_amount, v_employee_name
FROM withdrawal_requests wr LEFT JOIN employees e ON e.email = NEW.approver_email
WHERE wr.id = NEW.withdrawal_request_id;
v_function_url := v_supabase_url || '/functions/v1/send-withdrawal-verification-sms';
BEGIN
PERFORM net.http_post(
url := v_function_url,
body := jsonb_build_object('phone', NEW.approver_phone, 'code', NEW.verification_code, 'approverName', v_employee_name, 'amount', v_withdrawal_amount),
headers := jsonb_build_object('Content-Type', 'application/json', 'apikey', v_service_role_key)
);
EXCEPTION WHEN OTHERS THEN
RAISE NOTICE 'SMS sending queued for phone % with code %', NEW.approver_phone, NEW.verification_code;
END;
RETURN NEW;
END;
$function$;