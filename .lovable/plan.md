## Payroll Deductions Module (NSSF + PAYE)

Add statutory NSSF and PAYE deductions to payroll, with admin review/approval before disbursement, separate statutory liability records, and reports.

### 1. Database changes (one migration)

**Extend `employee_salary_payments`** — add columns:
- `nssf_employee` numeric default 0 (5% of gross, deducted from employee)
- `nssf_employer` numeric default 0 (10% of gross, employer cost)
- `nssf_total` numeric default 0 (15%)
- `taxable_income` numeric default 0 (gross − nssf_employee)
- `paye` numeric default 0
- `disbursement_reference` text
- `approved_by` text, `approved_at` timestamptz
- `payroll_run_id` uuid

**New table `payroll_runs`**:
- month (text), status (`draft` | `pending_approval` | `approved` | `disbursed`)
- totals: gross, nssf_employee, nssf_employer, paye, net
- created_by, approved_by, approved_at, disbursed_at

**New table `statutory_liabilities`** (one row per employee per run per type):
- payroll_run_id, employee_id, employee_name, month
- type (`nssf_employee` | `nssf_employer` | `paye`)
- amount, status (`pending` | `remitted`), remitted_at, remittance_ref

**New table `employee_tax_profile`** (optional overrides):
- employee_id, tin, nssf_number, nssf_exempt bool, paye_exempt bool

RLS: admin/HR/finance read-write, employees read their own rows.

### 2. Calculation logic (`src/lib/payroll/statutory.ts`)

Pure functions used by both UI preview and edge functions:

```ts
calculateNSSF(gross) → { employee: gross*0.05, employer: gross*0.10, total: gross*0.15 }

calculatePAYE(taxable) per URA monthly bands:
  ≤ 235,000           → 0
  235,001 – 335,000   → 10% × (x − 235,000)
  335,001 – 410,000   → 10,000 + 20% × (x − 335,000)
  410,001 – 10,000,000→ 25,000 + 30% × (x − 410,000)
  > 10,000,000        → above + additional 10% on excess over 10M

calculatePayroll(gross, {nssfExempt, payeExempt}) →
  { gross, nssfEmployee, nssfEmployer, taxable, paye, net }
```

### 3. Edge function updates

- **`process-auto-salaries`**: compute NSSF + PAYE, store on payment row, write 3 `statutory_liabilities` rows, credit only `net` (gross − nssf_employee − paye − advance − time_deduction).
- **New `run-payroll-preview`**: build a draft `payroll_runs` row with per-employee preview (no disbursement). Admin reviews.
- **New `approve-payroll-run`**: marks run `approved`, then triggers disbursement (reuses auto-salary credit/SMS/email logic).

### 4. Frontend

**New page `src/pages/v2/hr/Payroll.tsx`** with tabs:
- **Run payroll** — pick month → preview table (employee, gross, NSSF 5%, PAYE, net) with totals row → Submit for approval.
- **Pending approval** — admin reviews run, can approve/reject. Approve triggers disbursement.
- **History** — past runs, status, totals, drill-down to employees.
- **Reports** (printable + CSV export):
  1. Employee payroll summary (per run)
  2. NSSF monthly schedule (employee + employer columns, totals)
  3. PAYE monthly schedule
  4. Net salary disbursement report
  5. Employer statutory cost report (NSSF employer 10% + any other employer costs)

Update existing **payslip PDF** (`generate-payslip`) to show NSSF (employee) and PAYE rows in the deductions section, plus an info line showing employer NSSF (not deducted).

Add nav entry under HR for "Payroll & Statutory".

### 5. Admin gate

- Disbursement only fires when run status = `approved`.
- Approval requires admin role (`admin` or `finance`); reuses existing approval separation-of-duties (creator ≠ approver).

### Out of scope (not in this change)
- LST (local service tax), pension top-ups
- Bulk URA/NSSF e-filing exports beyond CSV
- Editing per-employee gross from the preview screen (edit on employee record as today)

### Files to add
- `supabase/migrations/<ts>_payroll_deductions.sql`
- `src/lib/payroll/statutory.ts` (+ unit-friendly pure fns)
- `src/pages/v2/hr/Payroll.tsx`
- `src/components/hr/payroll/PayrollPreviewTable.tsx`
- `src/components/hr/payroll/PayrollRunsList.tsx`
- `src/components/hr/payroll/reports/*` (5 report components)
- `src/hooks/usePayrollRuns.ts`
- `supabase/functions/run-payroll-preview/index.ts`
- `supabase/functions/approve-payroll-run/index.ts`

### Files to modify
- `supabase/functions/process-auto-salaries/index.ts` — add NSSF + PAYE calc, write statutory_liabilities, credit net.
- `supabase/functions/generate-payslip/index.ts` — render NSSF + PAYE deduction rows.
- `src/components/v2/hr/ProcessPayrollDialog.tsx` — show new deduction columns.
- HR navigation — add Payroll page link.