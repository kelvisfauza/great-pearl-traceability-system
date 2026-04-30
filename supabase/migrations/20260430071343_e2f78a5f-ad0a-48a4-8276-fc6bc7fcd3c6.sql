INSERT INTO public.ledger_entries (user_id, entry_type, amount, reference, source_category, metadata)
VALUES (
  'de3f30f8-9994-430d-845a-d1439bfa113a',
  'DEPOSIT',
  6000,
  'USSD-DEPOSIT-USSD-SVC-1777532625972-7L99',
  'SELF_DEPOSIT',
  jsonb_build_object(
    'type', 'ussd_wallet_deposit',
    'description', 'USSD wallet deposit from 256778536681 (manual recovery)',
    'phone', '256778536681',
    'employee_id', '507ae419-b8de-4a16-8720-9d4fee57d1c7',
    'employee_email', 'operations@greatpearlcoffee.com',
    'ussd_reference', 'USSD-SVC-1777532625972-7L99',
    'manual_recovery', true,
    'source', 'mobile_money',
    'provider', 'yo_payments'
  )
);