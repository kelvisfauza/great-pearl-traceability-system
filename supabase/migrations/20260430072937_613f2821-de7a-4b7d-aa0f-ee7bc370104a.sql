INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, source_category, metadata)
VALUES (
  '010f057a-92e3-479d-89b2-a801ef851949',
  'DEPOSIT',
  1000,
  'USSD-DEPOSIT-USSD-SVC-1777533308240-QJKT',
  'SELF_DEPOSIT',
  jsonb_build_object(
    'type', 'ussd_wallet_deposit',
    'description', 'USSD wallet deposit from 256773318456 (manual recovery)',
    'phone', '256773318456',
    'caller_phone', '256773318456',
    'employee_id', '6a1a2e65-4d07-4e0d-a016-34143297caaa',
    'employee_email', 'tatwanzire@greatpearlcoffee.com',
    'ussd_reference', 'USSD-SVC-1777533308240-QJKT',
    'manual_recovery', true,
    'source', 'mobile_money',
    'provider', 'yo_payments'
  )
);