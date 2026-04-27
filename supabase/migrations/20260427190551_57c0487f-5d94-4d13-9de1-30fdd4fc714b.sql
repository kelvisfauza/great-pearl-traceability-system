-- Enums
DO $$ BEGIN
  CREATE TYPE public.treasury_direction AS ENUM ('credit','debit');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.treasury_channel AS ENUM ('yo_payments','cash','bank','internal','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.treasury_category AS ENUM (
    'withdrawal','deposit','transfer','provider_payout','meal_plan',
    'topup','reconciliation','adjustment','refund','fee'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.treasury_pool_balance (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  current_balance NUMERIC NOT NULL DEFAULT 0,
  last_yo_synced_balance NUMERIC,
  last_yo_synced_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.treasury_pool_balance (id, current_balance)
VALUES (1, 0) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.treasury_pool_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  direction public.treasury_direction NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  channel public.treasury_channel NOT NULL DEFAULT 'yo_payments',
  category public.treasury_category NOT NULL,
  reference TEXT,
  related_user_email TEXT,
  related_user_name TEXT,
  description TEXT,
  performed_by TEXT,
  balance_after NUMERIC,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_treasury_entries_created_at ON public.treasury_pool_entries (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_treasury_entries_category ON public.treasury_pool_entries (category);
CREATE INDEX IF NOT EXISTS idx_treasury_entries_channel ON public.treasury_pool_entries (channel);
CREATE INDEX IF NOT EXISTS idx_treasury_entries_reference ON public.treasury_pool_entries (reference);

ALTER TABLE public.treasury_pool_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treasury_pool_balance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "treasury_entries_admin_select" ON public.treasury_pool_entries;
CREATE POLICY "treasury_entries_admin_select" ON public.treasury_pool_entries
  FOR SELECT USING (
    public.has_role(auth.uid(), 'Administrator'::public.app_role)
    OR public.has_role(auth.uid(), 'Super Admin'::public.app_role)
  );

DROP POLICY IF EXISTS "treasury_entries_admin_insert" ON public.treasury_pool_entries;
CREATE POLICY "treasury_entries_admin_insert" ON public.treasury_pool_entries
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'Administrator'::public.app_role)
    OR public.has_role(auth.uid(), 'Super Admin'::public.app_role)
  );

DROP POLICY IF EXISTS "treasury_balance_admin_select" ON public.treasury_pool_balance;
CREATE POLICY "treasury_balance_admin_select" ON public.treasury_pool_balance
  FOR SELECT USING (
    public.has_role(auth.uid(), 'Administrator'::public.app_role)
    OR public.has_role(auth.uid(), 'Super Admin'::public.app_role)
  );

DROP POLICY IF EXISTS "treasury_balance_admin_update" ON public.treasury_pool_balance;
CREATE POLICY "treasury_balance_admin_update" ON public.treasury_pool_balance
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'Administrator'::public.app_role)
    OR public.has_role(auth.uid(), 'Super Admin'::public.app_role)
  );

CREATE OR REPLACE FUNCTION public.record_treasury_entry(
  p_direction public.treasury_direction,
  p_amount NUMERIC,
  p_channel public.treasury_channel,
  p_category public.treasury_category,
  p_reference TEXT DEFAULT NULL,
  p_related_user_email TEXT DEFAULT NULL,
  p_related_user_name TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_performed_by TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance NUMERIC;
  v_entry_id UUID;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Treasury amount must be > 0';
  END IF;

  UPDATE public.treasury_pool_balance
  SET current_balance = current_balance + (CASE WHEN p_direction = 'credit' THEN p_amount ELSE -p_amount END),
      updated_at = now()
  WHERE id = 1
  RETURNING current_balance INTO v_new_balance;

  INSERT INTO public.treasury_pool_entries (
    direction, amount, channel, category, reference,
    related_user_email, related_user_name, description,
    performed_by, balance_after, metadata
  ) VALUES (
    p_direction, p_amount, p_channel, p_category, p_reference,
    p_related_user_email, p_related_user_name, p_description,
    p_performed_by, v_new_balance, COALESCE(p_metadata, '{}'::jsonb)
  ) RETURNING id INTO v_entry_id;

  RETURN v_entry_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_treasury_entry(
  public.treasury_direction, NUMERIC, public.treasury_channel, public.treasury_category,
  TEXT, TEXT, TEXT, TEXT, TEXT, JSONB
) TO authenticated, service_role;

-- Auto-trigger from wallet ledger
CREATE OR REPLACE FUNCTION public.trg_ledger_to_treasury()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
  v_name TEXT;
  v_source TEXT;
  v_desc TEXT;
  v_channel public.treasury_channel := 'yo_payments';
  v_category public.treasury_category;
  v_amount NUMERIC;
  v_meta_type TEXT;
BEGIN
  v_source := UPPER(COALESCE(NEW.source_category, NEW.metadata->>'source', ''));
  v_desc := COALESCE(NEW.metadata->>'description', NEW.entry_type::text);
  v_meta_type := COALESCE(NEW.metadata->>'type','');

  -- Skip purely internal accounting movements
  IF v_source IN (
    'SALARY','SYSTEM_AWARD','LOAN_DISBURSEMENT','LOAN_REPAYMENT',
    'BONUS','OVERTIME','ALLOWANCE','PER_DIEM','EXPENSE',
    'INVEST','INVESTMENT_RETURN','TRANSFER_INTERNAL','REVERSAL_INTERNAL',
    'PENALTY','LOYALTY','SELF_AWARD','LOAN_TOPUP_DISBURSEMENT'
  ) THEN
    RETURN NEW;
  END IF;

  SELECT email, name INTO v_email, v_name
  FROM public.employees WHERE auth_user_id = NEW.user_id LIMIT 1;

  v_amount := ABS(NEW.amount);
  IF v_amount = 0 THEN RETURN NEW; END IF;

  IF NEW.entry_type = 'WITHDRAWAL' OR NEW.amount < 0 THEN
    IF v_meta_type IN ('admin_cash_withdrawal','cash_requisition') THEN
      v_channel := 'cash';
    END IF;

    -- Categorize transfers and provider payouts distinctly
    IF v_source LIKE '%TRANSFER%' OR v_meta_type LIKE '%transfer%' THEN
      v_category := 'transfer';
    ELSIF v_source LIKE '%PROVIDER%' OR v_meta_type LIKE '%provider%' OR v_meta_type LIKE '%meal%' THEN
      v_category := 'provider_payout';
    ELSE
      v_category := 'withdrawal';
    END IF;

    PERFORM public.record_treasury_entry(
      'debit', v_amount, v_channel, v_category,
      NEW.reference, v_email, v_name, v_desc,
      COALESCE(NEW.metadata->>'initiated_by','system'),
      jsonb_build_object('ledger_entry_id', NEW.id, 'source', v_source, 'auto', true)
    );
  ELSIF NEW.entry_type = 'DEPOSIT' AND NEW.amount > 0 THEN
    PERFORM public.record_treasury_entry(
      'credit', v_amount, 'yo_payments', 'deposit',
      NEW.reference, v_email, v_name, v_desc,
      COALESCE(NEW.metadata->>'initiated_by','system'),
      jsonb_build_object('ledger_entry_id', NEW.id, 'source', v_source, 'auto', true)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ledger_to_treasury ON public.ledger_entries;
CREATE TRIGGER trg_ledger_to_treasury
  AFTER INSERT ON public.ledger_entries
  FOR EACH ROW EXECUTE FUNCTION public.trg_ledger_to_treasury();