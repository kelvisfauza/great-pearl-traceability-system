
INSERT INTO public.ledger_entries (
  user_id,
  entry_type,
  amount,
  reference,
  source_category,
  metadata
)
VALUES (
  '5ac019de-199c-4a3f-97de-96de786f55dc',
  'DEBIT',
  381052,
  'ADMIN-ADJUST-SSERUNKUMA-' || to_char(now(), 'YYYYMMDDHH24MISS'),
  'OTHER',
  jsonb_build_object(
    'type', 'admin_wallet_adjustment',
    'description', 'Admin wallet adjustment: balance reduced to UGX 40,000. Reason: salary credits received during period of non-work.',
    'previous_balance', 421052,
    'new_balance', 40000,
    'adjustment_amount', 381052,
    'adjusted_by', 'Fauzakusa@greatpearlcoffee.com',
    'employee_name', 'Sserunkuma Taufiq',
    'employee_email', 'sserunkumataufique@greatpearlcoffee.com'
  )
);
