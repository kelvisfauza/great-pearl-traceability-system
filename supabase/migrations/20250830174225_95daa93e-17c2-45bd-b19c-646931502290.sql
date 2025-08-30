-- Move Denis's ledger entries from Supabase UUID to his Firebase UID
-- First update his employee record to use his Firebase UID properly
UPDATE public.employees 
SET auth_user_id = NULL 
WHERE name = 'Artwanzire Timothy';

-- Update Denis's actual employee record (bwambale denis) to use his Firebase ID as a text field
UPDATE public.employees 
SET employee_id = 'JSxZYOSxmde6Cqra4clQNc92mRS2',
    salary = 300000
WHERE name = 'bwambale denis' OR email = 'bwambaledenis8@gmail.com';

-- Create a new user_accounts entry for Denis's Firebase ID
INSERT INTO public.user_accounts (user_id, current_balance, total_earned, total_withdrawn, salary_approved)
VALUES ('JSxZYOSxmde6Cqra4clQNc92mRS2', 290322.60, 290322.60, 0, 0)
ON CONFLICT (user_id) 
DO UPDATE SET 
  current_balance = 290322.60,
  total_earned = 290322.60,
  updated_at = now();

-- Copy ledger entries to Denis's Firebase ID
INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, metadata, created_at, updated_at)
SELECT 
  'JSxZYOSxmde6Cqra4clQNc92mRS2' as user_id,
  entry_type,
  amount,
  reference,
  metadata,
  created_at,
  updated_at
FROM public.ledger_entries 
WHERE user_id = 'e5c7b8bc-1f27-4c0f-a750-c6f4e8b4a641'
ON CONFLICT (user_id, reference) DO NOTHING;