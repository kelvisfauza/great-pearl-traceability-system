-- Add payout tracking columns to money_requests
ALTER TABLE money_requests ADD COLUMN IF NOT EXISTS payout_status text DEFAULT NULL;
ALTER TABLE money_requests ADD COLUMN IF NOT EXISTS payout_error text DEFAULT NULL;
ALTER TABLE money_requests ADD COLUMN IF NOT EXISTS payout_ref text DEFAULT NULL;
ALTER TABLE money_requests ADD COLUMN IF NOT EXISTS payout_attempted_at timestamptz DEFAULT NULL;
ALTER TABLE money_requests ADD COLUMN IF NOT EXISTS channel text DEFAULT NULL;
ALTER TABLE money_requests ADD COLUMN IF NOT EXISTS request_ref text DEFAULT NULL;
ALTER TABLE money_requests ADD COLUMN IF NOT EXISTS disbursement_phone text DEFAULT NULL;

-- Drop and recreate view (column list changed)
DROP VIEW IF EXISTS withdrawal_requests;

CREATE VIEW withdrawal_requests AS
SELECT 
    mr.id,
    mr.user_id,
    mr.amount,
    mr.reason,
    mr.status,
    mr.request_type,
    mr.phone_number,
    mr.payment_channel,
    mr.payment_channel AS disbursement_method,
    COALESCE(mr.disbursement_phone, mr.phone_number) AS disbursement_phone,
    mr.disbursement_bank_name,
    mr.disbursement_account_number,
    mr.disbursement_account_name,
    mr.requested_by,
    mr.requested_by AS requester_email,
    e.name AS requester_name,
    mr.created_at,
    mr.updated_at,
    mr.requires_three_approvals,
    mr.admin_approved,
    mr.admin_approved_1,
    mr.admin_approved_1_by,
    mr.admin_approved_1_at,
    mr.admin_approved_2,
    mr.admin_approved_2_by,
    mr.admin_approved_2_at,
    mr.admin_approved_3,
    mr.admin_approved_3_by,
    mr.admin_approved_3_at,
    mr.wallet_balance_verified,
    mr.wallet_balance_at_approval,
    mr.payout_status,
    mr.payout_error,
    mr.payout_ref,
    mr.payout_ref AS payout_reference,
    mr.payout_attempted_at,
    mr.approved_by,
    mr.approved_at,
    mr.rejection_reason,
    mr.finance_approved_by,
    mr.finance_approved_at,
    mr.finance_reviewed,
    mr.finance_review_at,
    mr.finance_review_by,
    mr.admin_final_approval,
    mr.admin_final_approval_at,
    mr.admin_final_approval_by,
    COALESCE(mr.channel, mr.payment_channel) AS channel,
    mr.request_ref
FROM money_requests mr
LEFT JOIN employees e ON mr.requested_by = e.email
WHERE mr.request_type = 'withdrawal';