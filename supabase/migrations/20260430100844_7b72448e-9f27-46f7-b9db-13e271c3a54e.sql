-- Drop ambiguous text-arg overloads so the uuid versions are unambiguously selected
DROP FUNCTION IF EXISTS public.approve_transfer_reversal(p_request_id text, p_notes text);
DROP FUNCTION IF EXISTS public.reverse_wallet_transfer(p_ledger_entry_id text, p_admin_reason text);