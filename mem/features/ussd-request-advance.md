---
name: USSD Request Advance Service
description: USSD option 4 lets callers request an advance; on approval, money is sent to caller phone via Yo Payments
type: feature
---
**USSD "Request Advance" (service_key=4 in `ussd_services`)**
- Caller dials *217*914# → Other Services → 4. Request Advance → enters amount.
- On Yo IPN, `ussd-payment-success` detects service 4 and:
  1. Creates an `approval_requests` row (type='USSD Advance Request', status='Pending Admin', stage='pending_admin', disbursement_method='MOBILE_MONEY', disbursement_phone=caller).
  2. Inserts tracking row in `ussd_advance_requests`.
  3. Refunds the inbound USSD payment via `yoPayout` so the caller is not charged for requesting.
- Approval flow: Admin First → Finance Last (per project standard).
- After both approvals (`status='Approved'`), the `ussd-advance-disburse` edge function (cron: every minute) sends the requested amount to the caller's phone using `yoPayout`. Tracking row gets `disbursement_status='completed'` and reference.
- Tracking table `ussd_advance_requests` columns: phone, amount, requester_name, employee_id, approval_request_id, status, disbursement_status, disbursement_attempted_at/completed_at/reference/error, ussd_reference.
