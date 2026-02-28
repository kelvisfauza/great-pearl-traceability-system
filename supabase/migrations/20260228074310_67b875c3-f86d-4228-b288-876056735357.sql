
-- =============================================
-- 1. Add multi-tier approval columns to withdrawal_requests
-- =============================================
ALTER TABLE public.withdrawal_requests
  ADD COLUMN IF NOT EXISTS admin_approved_1_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS admin_approved_1_by TEXT,
  ADD COLUMN IF NOT EXISTS admin_approved_2_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS admin_approved_2_by TEXT,
  ADD COLUMN IF NOT EXISTS admin_approved_3_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS admin_approved_3_by TEXT,
  ADD COLUMN IF NOT EXISTS finance_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS finance_approved_by TEXT,
  ADD COLUMN IF NOT EXISTS requires_three_approvals BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS requester_name TEXT,
  ADD COLUMN IF NOT EXISTS requester_email TEXT,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS rejected_by TEXT,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS disbursement_method TEXT DEFAULT 'mobile_money';

-- =============================================
-- 2. Add disbursement fields to approval_requests
-- =============================================
ALTER TABLE public.approval_requests
  ADD COLUMN IF NOT EXISTS disbursement_method TEXT DEFAULT 'cash',
  ADD COLUMN IF NOT EXISTS disbursement_phone TEXT,
  ADD COLUMN IF NOT EXISTS disbursement_bank_name TEXT,
  ADD COLUMN IF NOT EXISTS disbursement_account_number TEXT,
  ADD COLUMN IF NOT EXISTS disbursement_account_name TEXT;

-- =============================================
-- 3. Replace the withdrawal status trigger to support approval workflow
-- =============================================
CREATE OR REPLACE FUNCTION public.process_withdrawal_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Set requires_three_approvals based on amount
  IF NEW.amount > 100000 THEN
    NEW.requires_three_approvals := true;
  ELSE
    NEW.requires_three_approvals := false;
  END IF;

  -- Skip processing for terminal statuses
  IF NEW.status IN ('rejected', 'cancelled') THEN
    RETURN NEW;
  END IF;

  -- When withdrawal is rejected
  IF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
    NEW.rejected_at = now();
  END IF;

  -- Auto-update status based on approval state
  IF NEW.requires_three_approvals THEN
    -- 3 admins + finance
    IF NEW.finance_approved_at IS NOT NULL AND 
       NEW.admin_approved_1_at IS NOT NULL AND 
       NEW.admin_approved_2_at IS NOT NULL AND 
       NEW.admin_approved_3_at IS NOT NULL AND
       OLD.status != 'approved' THEN
      NEW.status := 'approved';
      NEW.approved_at := now();
    END IF;
  ELSE
    -- 1 admin + finance
    IF NEW.finance_approved_at IS NOT NULL AND 
       NEW.admin_approved_1_at IS NOT NULL AND
       OLD.status != 'approved' THEN
      NEW.status := 'approved';
      NEW.approved_at := now();
    END IF;
  END IF;

  -- When withdrawal becomes fully approved, create the ledger deduction
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    INSERT INTO ledger_entries (
      user_id,
      entry_type,
      amount,
      reference,
      metadata,
      created_at
    ) VALUES (
      NEW.user_id,
      'WITHDRAWAL',
      -NEW.amount,
      'WITHDRAWAL-' || NEW.id,
      json_build_object(
        'withdrawal_id', NEW.id,
        'phone_number', NEW.phone_number,
        'channel', NEW.channel,
        'disbursement_method', NEW.disbursement_method,
        'admin_approvals', CASE 
          WHEN NEW.requires_three_approvals THEN 3
          ELSE 1
        END,
        'finance_approved_by', NEW.finance_approved_by
      ),
      now()
    );
    NEW.processed_at = now();
  END IF;
  
  RETURN NEW;
END;
$function$;

-- =============================================
-- 4. Update default status for new withdrawal requests to 'pending_approval'
-- =============================================
ALTER TABLE public.withdrawal_requests ALTER COLUMN status SET DEFAULT 'pending_approval';
