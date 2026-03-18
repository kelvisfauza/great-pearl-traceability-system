
-- Fix: Update the BEFORE trigger on money_requests to also auto-set approved_at
-- when admin_final_approval is true (alternative to requiring admin_approved_2_at)
CREATE OR REPLACE FUNCTION set_withdrawal_approval_requirements()
RETURNS TRIGGER AS $$
BEGIN
  -- Set requires_three_approvals based on amount threshold
  IF NEW.amount > 100000 THEN
    NEW.requires_three_approvals = true;
  ELSE
    NEW.requires_three_approvals = false;
  END IF;

  -- Skip terminal statuses
  IF NEW.status IN ('rejected', 'Rejected', 'cancelled', 'Cancelled', 'Withdrawn') THEN
    RETURN NEW;
  END IF;

  -- Auto-set approved_at when all approval conditions are met
  -- This ensures consistency even if different frontend paths set different fields
  IF NEW.request_type = 'withdrawal' AND NEW.finance_approved_at IS NOT NULL THEN
    IF NEW.requires_three_approvals THEN
      -- Three-approval flow: need admin_approved_2_at OR admin_final_approval
      IF (NEW.admin_approved_2_at IS NOT NULL OR NEW.admin_final_approval = true) 
         AND NEW.admin_approved_1_at IS NOT NULL 
         AND NEW.approved_at IS NULL THEN
        NEW.approved_at := COALESCE(NEW.admin_final_approval_at, NEW.admin_approved_2_at, now());
        NEW.approved_by := COALESCE(NEW.admin_final_approval_by, NEW.admin_approved_2_by);
        NEW.status := 'approved';
        -- Backfill admin_approved_2_at if missing but admin_final_approval is set
        IF NEW.admin_approved_2_at IS NULL AND NEW.admin_final_approval = true THEN
          NEW.admin_approved_2_at := NEW.admin_final_approval_at;
          NEW.admin_approved_2_by := NEW.admin_final_approval_by;
        END IF;
      END IF;
    ELSE
      -- Two-approval flow: need admin_approved_1_at
      IF NEW.admin_approved_1_at IS NOT NULL AND NEW.approved_at IS NULL THEN
        NEW.approved_at := COALESCE(NEW.admin_approved_1_at, now());
        NEW.approved_by := COALESCE(NEW.admin_approved_1_by);
        NEW.status := 'approved';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
