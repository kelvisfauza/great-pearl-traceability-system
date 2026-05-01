INSERT INTO ledger_entries (user_id, entry_type, amount, source_category, reference, metadata)
VALUES (
  'eba97d3e-f098-467a-ad78-d0b9639d76a8',
  'DEPOSIT',
  41000,
  'SYSTEM_AWARD',
  'REVERSAL-INSTANT-WD-f1dbc925-7cc3-404a-9a92-1957da25fb95',
  jsonb_build_object(
    'description','Recredit: declined instant withdrawal of UGX 41,000',
    'reversed_entry_id','78f1e052-d872-4c36-a1ea-91460e7e3bce',
    'instant_withdrawal_id','f1dbc925-7cc3-404a-9a92-1957da25fb95',
    'reason','Declined by admin',
    'category','REVERSAL',
    'employee_name','Bwambale Benson',
    'employee_email','bwambalebenson@greatpearlcoffee.com'
  )
);

UPDATE instant_withdrawals
SET payout_status = 'declined',
    completed_at = now()
WHERE id = 'f1dbc925-7cc3-404a-9a92-1957da25fb95';