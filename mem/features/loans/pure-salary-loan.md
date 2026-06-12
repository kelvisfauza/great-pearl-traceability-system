---
name: Pure Salary Loan
description: Salary-secured loan type — 15%/month flat, max 3 months, no guarantor, repaid by 50% of monthly salary with mid-month freeze rule
type: feature
---
# Pure Salary Loan (`loan_type = 'pure_salary'`)

- Interest: 15% per month, flat (cap 45%). Stored on `loans.interest_rate = 15`.
- Max duration: 3 months.
- No guarantor. Skips `pending_guarantor`; submits directly as `pending_admin`.
- Evaluation still required (same engine), but the borrowing cap is `floor(salary * 0.5) * months`, NOT the AI `max_limit`.
- Installment: `floor(salary * 0.5)` per month, anchored to the 27th payroll date (not the disbursement day).
- Mid-month freeze: if disbursement day < 27, the schedule includes TWO installments in the first cycle — 50% on the 27th, and the other 50% on the last day of that month (frozen half released at month-end). After that, normal monthly 50% on each 27th until cleared.
- Default: standard overdue handling and penalties; no auto-extension.
- Approval flow lives in `src/pages/QuickLoans.tsx` `handleApproval` under the `isPureSalary` branch. Schedule generation walks `loan_repayments` row-by-row capped at half-salary until `total_repayable` is exhausted.