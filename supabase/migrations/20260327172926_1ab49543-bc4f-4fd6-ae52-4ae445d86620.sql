-- 1. Add source_category to ledger_entries
ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS source_category text DEFAULT 'OTHER';

-- 2. Validate source_category via trigger
CREATE OR REPLACE FUNCTION validate_source_category()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.source_category NOT IN (
    'SELF_DEPOSIT', 'SYSTEM_AWARD', 'LOAN_DISBURSEMENT', 
    'TRANSFER_IN', 'SALARY', 'EXPENSE_CREDIT', 'WITHDRAWAL', 'OTHER'
  ) THEN
    RAISE EXCEPTION 'Invalid source_category: %', NEW.source_category;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_source_category ON ledger_entries;
CREATE TRIGGER trg_validate_source_category
  BEFORE INSERT OR UPDATE ON ledger_entries
  FOR EACH ROW EXECUTE FUNCTION validate_source_category();

-- 3. Backfill existing entries
UPDATE ledger_entries SET source_category = 'SELF_DEPOSIT'
WHERE entry_type = 'DEPOSIT' AND (
  reference LIKE 'DEPOSIT-DEP-%' OR
  (metadata->>'provider' = 'gosentepay' AND metadata->>'transaction_ref' IS NOT NULL)
);

UPDATE ledger_entries SET source_category = 'SALARY'
WHERE entry_type = 'DEPOSIT' AND (
  reference LIKE 'SALARY-%' OR
  metadata->>'source' = 'auto_salary'
);

UPDATE ledger_entries SET source_category = 'EXPENSE_CREDIT'
WHERE entry_type = 'DEPOSIT' AND reference LIKE 'EXPENSE-APPROVED-%';

UPDATE ledger_entries SET source_category = 'TRANSFER_IN'
WHERE entry_type = 'DEPOSIT' AND (
  reference LIKE '%-IN-%' OR
  metadata->>'type' = 'wallet_transfer'
);

UPDATE ledger_entries SET source_category = 'LOAN_DISBURSEMENT'
WHERE entry_type = 'DEPOSIT' AND (
  reference LIKE 'LOAN-DISBURSE%' OR
  metadata->>'source' = 'loan_disbursement'
);

UPDATE ledger_entries SET source_category = 'SYSTEM_AWARD'
WHERE entry_type IN ('LOYALTY_REWARD', 'BONUS', 'ADJUSTMENT', 'SALARY_ADJUSTMENT');

UPDATE ledger_entries SET source_category = 'WITHDRAWAL'
WHERE entry_type = 'WITHDRAWAL';

UPDATE ledger_entries SET source_category = 'SYSTEM_AWARD'
WHERE source_category = 'OTHER' AND entry_type = 'DEPOSIT';

-- 4. Instant withdrawal tracking table
CREATE TABLE IF NOT EXISTS instant_withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  amount numeric NOT NULL,
  phone_number text NOT NULL,
  payout_ref text,
  payout_status text DEFAULT 'pending',
  ledger_reference text,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE instant_withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own instant withdrawals"
ON instant_withdrawals FOR SELECT TO authenticated
USING (user_id = auth.uid()::text OR user_id = (SELECT get_unified_user_id(get_current_user_email())));

CREATE POLICY "System can insert instant withdrawals"
ON instant_withdrawals FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "System can update instant withdrawals"
ON instant_withdrawals FOR UPDATE TO authenticated
USING (true);

-- 5. RPC: Get self-deposit balance and instant withdrawal eligibility
CREATE OR REPLACE FUNCTION get_instant_withdrawal_eligibility(p_user_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id text;
  v_self_deposit_total numeric := 0;
  v_self_deposit_withdrawn numeric := 0;
  v_self_deposit_balance numeric := 0;
  v_today_instant_total numeric := 0;
  v_last_instant_at timestamptz;
  v_can_instant boolean := false;
  v_max_available numeric := 0;
  v_deposit_phone text;
BEGIN
  SELECT get_unified_user_id(p_user_email) INTO v_user_id;
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'User not found');
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_self_deposit_total
  FROM ledger_entries
  WHERE user_id = v_user_id AND source_category = 'SELF_DEPOSIT' AND amount > 0;

  SELECT COALESCE(SUM(amount), 0) INTO v_self_deposit_withdrawn
  FROM instant_withdrawals
  WHERE user_id = v_user_id AND payout_status IN ('success', 'pending');

  v_self_deposit_balance := GREATEST(0, v_self_deposit_total - v_self_deposit_withdrawn);

  SELECT COALESCE(SUM(amount), 0), MAX(created_at)
  INTO v_today_instant_total, v_last_instant_at
  FROM instant_withdrawals
  WHERE user_id = v_user_id
    AND payout_status IN ('success', 'pending')
    AND created_at >= (now() AT TIME ZONE 'Africa/Kampala')::date::timestamptz;

  IF v_last_instant_at IS NOT NULL AND v_last_instant_at > now() - interval '24 hours' THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'reason', 'You can only make one instant withdrawal per 24 hours',
      'self_deposit_balance', v_self_deposit_balance,
      'next_eligible_at', v_last_instant_at + interval '24 hours',
      'today_withdrawn', v_today_instant_total
    );
  END IF;

  v_max_available := LEAST(v_self_deposit_balance, 100000 - v_today_instant_total);
  v_max_available := GREATEST(0, v_max_available);

  SELECT metadata->>'phone' INTO v_deposit_phone
  FROM ledger_entries
  WHERE user_id = v_user_id AND source_category = 'SELF_DEPOSIT' AND amount > 0
  ORDER BY created_at DESC LIMIT 1;

  v_can_instant := v_max_available >= 2000;

  RETURN jsonb_build_object(
    'eligible', v_can_instant,
    'self_deposit_balance', v_self_deposit_balance,
    'max_instant_amount', v_max_available,
    'today_withdrawn', v_today_instant_total,
    'daily_limit', 100000,
    'deposit_phone', v_deposit_phone,
    'reason', CASE 
      WHEN NOT v_can_instant AND v_self_deposit_balance < 2000 THEN 'Insufficient self-deposited funds (minimum UGX 2,000)'
      WHEN NOT v_can_instant THEN 'Daily instant withdrawal limit reached'
      ELSE 'Eligible for instant withdrawal'
    END
  );
END;
$$;

-- 6. Auto-categorize new deposits via trigger
CREATE OR REPLACE FUNCTION auto_categorize_ledger_entry()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.source_category = 'OTHER' OR NEW.source_category IS NULL THEN
    IF NEW.entry_type = 'DEPOSIT' THEN
      IF NEW.reference LIKE 'DEPOSIT-DEP-%' OR (NEW.metadata->>'provider') = 'gosentepay' THEN
        NEW.source_category := 'SELF_DEPOSIT';
      ELSIF NEW.reference LIKE 'SALARY-%' OR (NEW.metadata->>'source') = 'auto_salary' THEN
        NEW.source_category := 'SALARY';
      ELSIF NEW.reference LIKE 'EXPENSE-APPROVED-%' THEN
        NEW.source_category := 'EXPENSE_CREDIT';
      ELSIF NEW.reference LIKE '%-IN-%' OR (NEW.metadata->>'type') = 'wallet_transfer' THEN
        NEW.source_category := 'TRANSFER_IN';
      ELSIF NEW.reference LIKE 'LOAN-DISBURSE%' OR (NEW.metadata->>'source') = 'loan_disbursement' THEN
        NEW.source_category := 'LOAN_DISBURSEMENT';
      ELSE
        NEW.source_category := 'SYSTEM_AWARD';
      END IF;
    ELSIF NEW.entry_type IN ('LOYALTY_REWARD', 'BONUS', 'ADJUSTMENT', 'SALARY_ADJUSTMENT') THEN
      NEW.source_category := 'SYSTEM_AWARD';
    ELSIF NEW.entry_type = 'WITHDRAWAL' THEN
      NEW.source_category := 'WITHDRAWAL';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_categorize_ledger ON ledger_entries;
CREATE TRIGGER trg_auto_categorize_ledger
  BEFORE INSERT ON ledger_entries
  FOR EACH ROW EXECUTE FUNCTION auto_categorize_ledger_entry();