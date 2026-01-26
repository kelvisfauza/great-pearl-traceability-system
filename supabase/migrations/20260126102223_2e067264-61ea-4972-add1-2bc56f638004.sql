-- Create pending approval request for Timothy's existing salary advance
-- This will allow Denis to approve first, then Fauza for final approval

INSERT INTO approval_requests (
  type,
  title,
  description,
  amount,
  requestedby,
  requestedby_name,
  requestedby_position,
  department,
  daterequested,
  priority,
  status,
  approval_stage,
  details
) VALUES (
  'Salary Advance',
  'Salary Advance Request - Artwanzire Timothy',
  'Salary advance request for Timothy.\n\nMinimum Monthly Payment: UGX 40,000\n\nThis advance requires Admin approval followed by Finance approval before activation.',
  200000,
  'tatwanzire@greatpearlcoffee.com',
  'Artwanzire Timothy',
  'Staff',
  'Human Resources',
  '2026-01-26',
  'High',
  'Pending',
  'pending_admin',
  '{"advance_type": "salary_advance", "employee_email": "tatwanzire@greatpearlcoffee.com", "employee_name": "Artwanzire Timothy", "employee_department": "Human Resources", "employee_position": "Staff", "advance_amount": 200000, "minimum_payment": 40000, "reason": "Salary advance request", "existing_advance_id": "6f94afa4-6c92-4dac-a730-90f97812dd66"}'::jsonb
);