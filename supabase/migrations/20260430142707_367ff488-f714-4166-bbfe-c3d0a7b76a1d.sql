CREATE OR REPLACE FUNCTION public.validate_source_category()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.source_category NOT IN (
    'SELF_DEPOSIT', 'SYSTEM_AWARD', 'LOAN_DISBURSEMENT', 'LOAN_REPAYMENT',
    'TRANSFER_IN', 'SALARY', 'EXPENSE_CREDIT', 'WITHDRAWAL', 'OTHER'
  ) THEN
    RAISE EXCEPTION 'Invalid source_category: %', NEW.source_category;
  END IF;
  RETURN NEW;
END;
$function$;