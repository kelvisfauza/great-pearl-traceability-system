
CREATE OR REPLACE FUNCTION public.process_withdrawal_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Set requires_three_approvals based on amount (kept for backward compat, but now means 2 admins)
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
    -- 2 admins + finance (changed from 3 admins + finance)
    IF NEW.finance_approved_at IS NOT NULL AND 
       NEW.admin_approved_1_at IS NOT NULL AND 
       NEW.admin_approved_2_at IS NOT NULL AND
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
          WHEN NEW.requires_three_approvals THEN 2
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
