
CREATE OR REPLACE FUNCTION public.process_money_request_three_tier_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Set requires_three_approvals for ANY request type exceeding 50,000 UGX
  IF NEW.amount > 50000 THEN
    NEW.requires_three_approvals := true;
  ELSE
    NEW.requires_three_approvals := false;
  END IF;

  -- Update status based on approvals
  IF NEW.requires_three_approvals THEN
    -- Need: finance + 2 admins
    IF NEW.finance_approved_at IS NOT NULL AND 
       NEW.admin_approved_1_at IS NOT NULL AND 
       NEW.admin_approved_2_at IS NOT NULL AND
       (OLD.status IS NULL OR OLD.status != 'Approved') THEN
      NEW.status := 'Approved';
    END IF;
  ELSE
    -- Standard 2-tier approval: finance + 1 admin
    IF NEW.finance_approved_at IS NOT NULL AND 
       NEW.admin_approved_at IS NOT NULL AND
       (OLD.status IS NULL OR OLD.status != 'Approved') THEN
      NEW.status := 'Approved';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;
