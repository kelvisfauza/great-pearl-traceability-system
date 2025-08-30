-- Copy Denis's ledger entries to his Firebase ID
INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, metadata, created_at, updated_at)
SELECT 
  'JSxZYOSxmde6Cqra4clQNc92mRS2' as user_id,
  entry_type,
  amount,
  REPLACE(reference, 'e5c7b8bc-1f27-4c0f-a750-c6f4e8b4a641', 'JSxZYOSxmde6Cqra4clQNc92mRS2') as reference,
  metadata,
  created_at,
  updated_at
FROM public.ledger_entries 
WHERE user_id = 'e5c7b8bc-1f27-4c0f-a750-c6f4e8b4a641';

-- Test Denis's new balance
SELECT public.get_wallet_balance_safe('JSxZYOSxmde6Cqra4clQNc92mRS2') as denis_balance;