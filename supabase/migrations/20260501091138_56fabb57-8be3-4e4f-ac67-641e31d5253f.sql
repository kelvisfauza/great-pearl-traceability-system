CREATE OR REPLACE FUNCTION public.get_yo_payments_audit(
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL,
  p_source text DEFAULT NULL,
  p_status text DEFAULT NULL
)
RETURNS TABLE (
  id text,
  source text,
  occurred_at timestamptz,
  amount numeric,
  phone text,
  recipient_name text,
  description text,
  yo_reference text,
  status text,
  initiated_by text,
  approved_by text,
  metadata jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH unified AS (
    -- 1) Instant Withdrawals (user-initiated MoMo)
    SELECT
      iw.id::text AS id,
      'Instant Withdrawal'::text AS source,
      iw.created_at AS occurred_at,
      iw.amount::numeric,
      iw.phone_number AS phone,
      COALESCE(e.name, iw.user_id::text) AS recipient_name,
      'Instant withdrawal to mobile money'::text AS description,
      iw.payout_ref AS yo_reference,
      COALESCE(iw.payout_status, 'unknown')::text AS status,
      COALESCE(e.name, iw.user_id::text) AS initiated_by,
      NULL::text AS approved_by,
      jsonb_build_object('ledger_reference', iw.ledger_reference, 'completed_at', iw.completed_at) AS metadata
    FROM instant_withdrawals iw
    LEFT JOIN employees e ON e.auth_user_id::text = iw.user_id::text OR e.id::text = iw.user_id::text

    UNION ALL

    -- 2) Withdrawal Requests with disbursement_method = mobile_money
    SELECT
      wr.id::text,
      'Withdrawal Request'::text,
      wr.created_at,
      wr.amount::numeric,
      COALESCE(wr.disbursement_phone, wr.phone_number),
      wr.requester_name,
      COALESCE(wr.reason, 'Withdrawal request')::text,
      NULL::text,
      wr.status::text,
      wr.requester_name,
      CONCAT_WS(' / ',
        NULLIF(wr.admin_approved_1_by, ''),
        NULLIF(wr.admin_approved_2_by, '')
      ) AS approved_by,
      jsonb_build_object(
        'request_type', wr.request_type,
        'disbursement_method', wr.disbursement_method,
        'payment_channel', wr.payment_channel
      )
    FROM withdrawal_requests wr
    WHERE wr.disbursement_method ILIKE '%mobile%' OR wr.disbursement_method ILIKE '%momo%' OR wr.disbursement_method IS NULL

    UNION ALL

    -- 3) Admin-initiated Withdrawals (5-digit PIN)
    SELECT
      aiw.id::text,
      'Admin Withdrawal'::text,
      aiw.created_at,
      aiw.amount::numeric,
      NULL::text,
      aiw.employee_name,
      COALESCE(aiw.reason, 'Admin-initiated deduction')::text,
      aiw.ledger_reference,
      aiw.status::text,
      aiw.initiated_by_name,
      aiw.initiated_by_name,
      jsonb_build_object('verified_at', aiw.verified_at, 'employee_email', aiw.employee_email)
    FROM admin_initiated_withdrawals aiw

    UNION ALL

    -- 4) Meal Disbursements
    SELECT
      md.id::text,
      'Meal Disbursement'::text,
      md.created_at,
      md.total_amount::numeric,
      md.receiver_phone,
      md.receiver_name,
      COALESCE(md.description, 'Meal disbursement')::text,
      md.yo_reference,
      COALESCE(md.yo_status, 'unknown')::text,
      md.initiated_by_name,
      md.initiated_by_name,
      jsonb_build_object('amount', md.amount, 'withdraw_charge', md.withdraw_charge)
    FROM meal_disbursements md

    UNION ALL

    -- 5) Service Provider Payments
    SELECT
      spp.id::text,
      'Service Provider'::text,
      spp.created_at,
      spp.total_amount::numeric,
      spp.receiver_phone,
      spp.receiver_name,
      COALESCE(spp.service_description, 'Service provider payout')::text,
      spp.yo_reference,
      COALESCE(spp.yo_status, 'unknown')::text,
      spp.initiated_by_name,
      spp.initiated_by_name,
      jsonb_build_object('amount', spp.amount, 'withdraw_charge', spp.withdraw_charge, 'notes', spp.notes)
    FROM service_provider_payments spp

    UNION ALL

    -- 6) Milling MoMo Transactions (collections C2B)
    SELECT
      mmt.id::text,
      'Milling MoMo'::text,
      mmt.created_at,
      mmt.amount::numeric,
      mmt.phone,
      mmt.customer_name,
      'Milling payment collection'::text,
      mmt.yo_reference,
      COALESCE(mmt.status, 'unknown')::text,
      mmt.initiated_by,
      NULL::text,
      COALESCE(mmt.metadata, '{}'::jsonb) || jsonb_build_object('reference', mmt.reference)
    FROM milling_momo_transactions mmt

    UNION ALL

    -- 7) USSD Advance Disbursements
    SELECT
      uar.id::text,
      'USSD Advance'::text,
      uar.created_at,
      uar.amount::numeric,
      uar.phone,
      uar.requester_name,
      'USSD-requested salary advance'::text,
      uar.disbursement_reference,
      COALESCE(uar.disbursement_status, uar.status, 'unknown')::text,
      uar.requester_name,
      NULL::text,
      jsonb_build_object('approval_request_id', uar.approval_request_id, 'ussd_reference', uar.ussd_reference, 'disbursement_error', uar.disbursement_error)
    FROM ussd_advance_requests uar

    UNION ALL

    -- 8) Monthly Allowances (airtime / data) — pulled from ledger PAYOUT entries
    SELECT
      le.id::text,
      CASE WHEN le.metadata->>'allowance_type' = 'data_allowance' THEN 'Data Allowance' ELSE 'Airtime Allowance' END,
      le.created_at,
      le.amount::numeric,
      le.metadata->>'phone',
      le.metadata->>'employee_name',
      COALESCE(le.metadata->>'description', 'Monthly allowance'),
      le.metadata->>'yo_reference',
      COALESCE(le.metadata->>'yo_status', 'unknown'),
      'System (Cron)'::text,
      'System (Cron)'::text,
      jsonb_build_object('month_year', le.metadata->>'month_year', 'allowance_type', le.metadata->>'allowance_type')
    FROM ledger_entries le
    WHERE le.entry_type = 'PAYOUT'
      AND le.metadata->>'disbursement_method' = 'yo_airtime'
  )
  SELECT * FROM unified
  WHERE
    (p_start_date IS NULL OR occurred_at >= p_start_date)
    AND (p_end_date IS NULL OR occurred_at <= p_end_date)
    AND (p_source IS NULL OR source = p_source)
    AND (p_status IS NULL OR status ILIKE '%' || p_status || '%')
  ORDER BY occurred_at DESC
  LIMIT 5000;
$$;

GRANT EXECUTE ON FUNCTION public.get_yo_payments_audit TO authenticated;