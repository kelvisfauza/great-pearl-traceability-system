
-- Fix the trigger to prevent status='approved' without admin approval
CREATE OR REPLACE FUNCTION process_withdrawal_status_change()
RETURNS TRIGGER AS $$
BEGIN
-- Set requires_three_approvals based on amount
IF NEW.amount > 100000 THEN
  NEW.requires_three_approvals := true;
ELSE
  NEW.requires_three_approvals := false;
END IF;

-- Skip processing for terminal statuses
IF NEW.status IN ('rejected', 'cancelled') THEN
  IF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
    NEW.rejected_at = now();
  END IF;
  RETURN NEW;
END IF;

-- GUARD: Prevent status being set to 'approved' without admin approval
-- This catches any code path that tries to approve without proper admin sign-off
IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
  IF NEW.admin_approved_1_at IS NULL THEN
    -- Force status back to pending_approval (Finance approved but no admin yet)
    IF NEW.finance_approved_at IS NOT NULL THEN
      NEW.status := 'pending_approval';
    ELSE
      NEW.status := 'pending';
    END IF;
    NEW.approved_at := NULL;
    NEW.approved_by := NULL;
    RETURN NEW;
  END IF;
  -- For three-approval requests, also require admin 2
  IF NEW.requires_three_approvals AND NEW.admin_approved_2_at IS NULL THEN
    NEW.status := 'pending_admin_2';
    NEW.approved_at := NULL;
    NEW.approved_by := NULL;
    RETURN NEW;
  END IF;
END IF;

-- Auto-update status based on approval state
IF NEW.requires_three_approvals THEN
  IF NEW.finance_approved_at IS NOT NULL AND 
     NEW.admin_approved_1_at IS NOT NULL AND 
     NEW.admin_approved_2_at IS NOT NULL AND
     OLD.status != 'approved' THEN
    NEW.status := 'approved';
    NEW.approved_at := now();
  END IF;
ELSE
  IF NEW.finance_approved_at IS NOT NULL AND 
     NEW.admin_approved_1_at IS NOT NULL AND
     OLD.status != 'approved' THEN
    NEW.status := 'approved';
    NEW.approved_at := now();
  END IF;
END IF;

-- When withdrawal becomes fully approved, create the ledger deduction
IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
  IF NOT EXISTS (
    SELECT 1 FROM ledger_entries 
    WHERE reference = 'WITHDRAWAL-' || NEW.id
  ) THEN
    INSERT INTO ledger_entries (
      user_id, entry_type, amount, reference, metadata, created_at
    ) VALUES (
      NEW.user_id, 'WITHDRAWAL', -NEW.amount, 'WITHDRAWAL-' || NEW.id,
      json_build_object(
        'withdrawal_id', NEW.id,
        'phone_number', NEW.phone_number,
        'channel', NEW.channel,
        'disbursement_method', NEW.disbursement_method,
        'admin_approvals', CASE WHEN NEW.requires_three_approvals THEN 2 ELSE 1 END,
        'finance_approved_by', NEW.finance_approved_by
      ), now()
    );
  END IF;
  NEW.processed_at = now();
END IF;

RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fix Tumwine's stuck withdrawal: reset to pending_approval
UPDATE withdrawal_requests 
SET status = 'pending_approval', 
    approved_at = NULL, 
    approved_by = NULL,
    payout_status = NULL,
    updated_at = now()
WHERE id = 'ba3c68e3-17c5-4cc5-b278-0a359e4bea6f' 
  AND admin_approved_1_at IS NULL;

-- Remove the premature ledger entry
DELETE FROM ledger_entries 
WHERE reference = 'WITHDRAWAL-ba3c68e3-17c5-4cc5-b278-0a359e4bea6f';
