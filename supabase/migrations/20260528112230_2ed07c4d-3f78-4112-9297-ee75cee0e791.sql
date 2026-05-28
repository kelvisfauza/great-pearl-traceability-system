UPDATE public.approval_requests
SET status='Approved',
    approval_stage='approved',
    finance_approved=true,
    finance_approved_by='AUTO (2 Admins - Monthly Allowance Prepayment)',
    finance_approved_at=now(),
    updated_at=now()
WHERE id='44964ebc-09bc-4980-a571-674728258f99'
  AND type='Monthly Allowance Prepayment';