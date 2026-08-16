---
name: Employee Business Loan
description: Low-rate business capital loan — 3%/month, up to 8 months monthly repayment, requires 2 guarantors evaluated for capacity
type: feature
---
# Employee Business Loan (`loan_type = 'business'`)

- Purpose: capital for employees' side businesses that back up their employment.
- Interest: 3% per month flat, total interest capped at 24%. `loans.interest_rate = 3`.
- Duration: 1–8 months (the `loans_duration_months_check` constraint allows up to 8). Monthly repayment only, flexible amount driven by the schedule.
- Guarantors: TWO required. Second guarantor lives in `loans.guarantor2_*` columns (id, name, email, phone, approval_code, approved, approved_at, declined). Loan moves to `pending_admin` only after BOTH guarantors enter their own 6-digit codes.
- Evaluation (`loan-evaluation` edge function) takes `guarantor_emails[]` and assesses each guarantor:
  `capacity = 6×salary (business loans; 2× for other products) + 50% positive wallet − 50% own outstanding loans − 50% existing guarantee exposure`;
  capacity = 0 (and the business loan is denied) if the guarantor has no salary, own defaults, defaulted guarantees, or any own loan currently overdue. A negative (overdraft) wallet is subtracted in full; a guarantor previously debited on someone else's loan has capacity halved.
  Entitlement ceiling for business loans is NOT salary-capped (a business generates its own repayment capacity): ceiling = combined guarantor capacity, capped at UGX 15,000,000. The UGX 2,000,000 floor applies ONLY when BOTH guarantors are clean (no defaults, no overdue loans, no prior guarantor recoveries, non-negative wallet); weak guarantors get the raw combined capacity, which can be far below the floor. Salary-based rules (debt-to-salary >= 3x, <2 months tenure, zero salary) do not deny or shrink a business loan. The evaluation decides the final take-home.
- Approval and disbursement follow the same admin flow as other loans.
- Repayment: wallet collections, MoMo, and payroll paths as usual. `process-loan-repayments` recovers from BOTH guarantor wallets in slot order (ref `LOAN-GUARANTOR-<loan>-<inst>` and `...-G2`).
