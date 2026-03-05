-- Auto-credit wallet when an expense request is fully approved
-- Only for My Expenses types: Cash Requisition, Personal Expense, Salary Request

CREATE OR REPLACE FUNCTION public.credit_wallet_on_expense_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id TEXT;
  v_reference TEXT;
  v_already_credited BOOLEAN;
BEGIN
  -- Only process when status changes to 'Approved'
  IF NEW.status != 'Approved' OR OLD.status = 'Approved' THEN
    RETURN NEW;
  END IF;

  -- Only credit for My Expenses types
  IF NEW.type NOT IN ('Cash Requisition', 'Personal Expense', 'Salary Request') THEN
    RETURN NEW;
  END IF;

  -- Get the unified user ID from the requester's email
  v_user_id := public.get_unified_user_id(NEW.requestedby);
  
  IF v_user_id IS NULL THEN
    RAISE WARNING 'Could not find user_id for email: %', NEW.requestedby;
    RETURN NEW;
  END IF;

  -- Build a unique reference to prevent duplicate credits
  v_reference := 'EXPENSE-APPROVED-' || NEW.id;

  -- Check if already credited (prevent duplicates)
  SELECT EXISTS (
    SELECT 1 FROM public.ledger_entries
    WHERE reference = v_reference
  ) INTO v_already_credited;

  IF v_already_credited THEN
    RETURN NEW;
  END IF;

  -- Credit the wallet
  INSERT INTO public.ledger_entries (
    user_id,
    entry_type,
    amount,
    reference,
    metadata,
    created_at
  ) VALUES (
    v_user_id,
    'DEPOSIT',
    NEW.amount,
    v_reference,
    json_build_object(
      'source', 'expense_approval',
      'request_id', NEW.id,
      'request_type', NEW.type,
      'title', NEW.title,
      'description', NEW.description,
      'approved_at', now()::text
    ),
    now()
  );

  RETURN NEW;
END;
$$;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS credit_wallet_on_expense_approval_trigger ON public.approval_requests;

-- Create the trigger
CREATE TRIGGER credit_wallet_on_expense_approval_trigger
  AFTER UPDATE ON public.approval_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.credit_wallet_on_expense_approval();