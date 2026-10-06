---
name: Loan Evaluation Appeal System
description: 3-admin appeal workflow; approved appeals still need guarantor code sign-off before payout
type: feature
---
When the loan evaluator returns `deny` or `max_limit < requested`, the user sees an "Appeal to Admin" button in QuickLoans. The appeal stores the guarantor(s) picked in the application form (required for every type except pure salary). Admins vote at `/admin/loan-appeals`; 3 matching votes decide (`tally_loan_appeal_votes`). Every vote needs a reason ≥20 chars; justification ≥30 chars.

On approval, non-pure-salary appeals do NOT pay immediately: `loan-appeal-disburse` creates the loan as `pending_guarantor` and sends each guarantor an approval code (SMS + email). If no guarantor was stored, the loan is `guarantor_declined` so the borrower picks one. When all guarantors approve with their codes, the app calls `loan-appeal-disburse` with `action: 'finalize'`, which activates the loan, builds the schedule and credits the wallet (no extra admin step). Emails go out at each stage: appeal submitted (borrower + guarantors), appeal approved/awaiting guarantor, guarantor code, guarantor response, approved + agreement.
