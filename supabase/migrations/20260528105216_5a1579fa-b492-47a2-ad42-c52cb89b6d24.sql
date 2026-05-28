INSERT INTO public.approval_requests (
  type, title, description, amount, requestedby, requestedby_name, requestedby_position,
  department, daterequested, priority, status, approval_stage, details
) VALUES (
  'Monthly Allowance Prepayment',
  'June 2026 Airtime & Data Prepayment',
  'Early disbursement of June 2026 airtime & data allowance via Yo Payments. Priority tier (Denis, Timothy, Wyclif, Fauza) receives UGX 20,000 each; all other 10 active staff receive UGX 10,000 each. The June 1st cron will skip these recipients automatically.',
  180000,
  'fauzakusa@greatpearlcoffee.com',
  'Fauza Kusa 2',
  'Administrator',
  'Operations',
  CURRENT_DATE,
  'High',
  'Pending Admin',
  'pending_admin',
  jsonb_build_object(
    'allowance_month', '2026-06',
    'priority_tier_amount', 20000,
    'standard_tier_amount', 10000,
    'priority_emails', jsonb_build_array(
      'bwambaledenis@greatpearlcoffee.com',
      'tatwanzire@greatpearlcoffee.com',
      'musemawyclif@greatpearlcoffee.com',
      'fauzakusa@greatpearlcoffee.com'
    ),
    'recipients_count', 14,
    'channel', 'yo_payments_airtime'
  )
);