-- Update Denis's user_accounts balance to match his ledger entries
UPDATE public.user_accounts 
SET 
  current_balance = (SELECT COALESCE(SUM(amount), 0) FROM public.ledger_entries WHERE user_id = 'e5c7b8bc-1f27-4c0f-a750-c6f4e8b4a641'),
  total_earned = (SELECT COALESCE(SUM(amount), 0) FROM public.ledger_entries WHERE user_id = 'e5c7b8bc-1f27-4c0f-a750-c6f4e8b4a641'),
  updated_at = now()
WHERE user_id = 'e5c7b8bc-1f27-4c0f-a750-c6f4e8b4a641';

-- Also update the Admin User's balance
UPDATE public.user_accounts 
SET 
  current_balance = (SELECT COALESCE(SUM(amount), 0) FROM public.ledger_entries WHERE user_id = '5fe8c99d-ee15-484d-8765-9bd4b37f961f'),
  total_earned = (SELECT COALESCE(SUM(amount), 0) FROM public.ledger_entries WHERE user_id = '5fe8c99d-ee15-484d-8765-9bd4b37f961f'),
  updated_at = now()
WHERE user_id = '5fe8c99d-ee15-484d-8765-9bd4b37f961f';