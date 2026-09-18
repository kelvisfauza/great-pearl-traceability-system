/**
 * Printable "Loan Terms Revision & Acceptance" form.
 *
 * Printed by an administrator after revising an applicant's loan terms so the
 * applicant can read, sign and return a paper copy alongside the electronic
 * signature captured in the app.
 */

const fmt = (n: number | null | undefined) => `UGX ${Number(n || 0).toLocaleString()}`;

const day = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export interface LoanRevisionPrintData {
  employee_name: string;
  employee_email?: string | null;
  employee_phone?: string | null;
  loan_type?: string | null;
  loan_amount?: number | null;
  original_loan_amount?: number | null;
  duration_months?: number | null;
  repayment_frequency?: string | null;
  total_repayable?: number | null;
  monthly_installment?: number | null;
  weekly_installment?: number | null;
  interest_rate?: number | null;
  revision_amount?: number | null;
  revision_duration_months?: number | null;
  revision_frequency?: string | null;
  revision_total_repayable?: number | null;
  revision_installment?: number | null;
  revision_note?: string | null;
  revision_by?: string | null;
  revision_at?: string | null;
}

export const printLoanRevisionAgreement = (loan: LoanRevisionPrintData) => {
  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) return;

  const currentInstallment = loan.repayment_frequency === 'weekly'
    ? loan.weekly_installment
    : loan.monthly_installment;

  w.document.write(`<html><head><title>Loan Terms Revision – ${loan.employee_name}</title>
  <style>
    body{font-family:Georgia,serif;padding:28px;color:#111;font-size:12px;line-height:1.55}
    h1{font-size:17px;margin:0}
    h2{font-size:13px;margin:16px 0 6px;border-bottom:1px solid #999;padding-bottom:3px}
    .head{text-align:center;border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:14px}
    table{width:100%;border-collapse:collapse;margin-bottom:8px}
    td,th{padding:5px 7px;border:1px solid #ccc;text-align:left}
    th{background:#f4f4f4}
    td.l{background:#f4f4f4;width:34%;font-weight:bold}
    .new{font-weight:bold}
    .note{border:1px solid #111;padding:8px;margin-top:8px}
    .sig{margin-top:34px;display:flex;justify-content:space-between}
    .sig div{width:45%;border-top:1px solid #111;padding-top:4px;font-size:11px}
  </style></head><body>
  <div class="head">
    <h1>YEDA COFFEE COMPANY LIMITED</h1>
    <div>Great Agro Coffee • P.O Box 431420, Kasese, Uganda • Operations: +256393101103</div>
    <div style="margin-top:6px;font-weight:bold">STAFF LOAN — TERMS REVISION &amp; ACCEPTANCE FORM</div>
  </div>

  <h2>A. Applicant</h2>
  <table>
    <tr><td class="l">Full Name</td><td>${loan.employee_name}</td><td class="l">Email</td><td>${loan.employee_email || '—'}</td></tr>
    <tr><td class="l">Phone</td><td>${loan.employee_phone || '—'}</td><td class="l">Loan Product</td><td>${loan.loan_type || 'Quick Loan'}</td></tr>
    <tr><td class="l">Revised By</td><td>${loan.revision_by || '—'}</td><td class="l">Revision Date</td><td>${day(loan.revision_at)}</td></tr>
  </table>

  <h2>B. Original vs Revised Terms</h2>
  <table>
    <tr><th>Item</th><th>Original terms</th><th>Revised terms</th></tr>
    <tr><td>Loan amount</td><td>${fmt(loan.loan_amount)}</td><td class="new">${fmt(loan.revision_amount)}</td></tr>
    <tr><td>Duration</td><td>${loan.duration_months || '—'} month(s)</td><td class="new">${loan.revision_duration_months || '—'} month(s)</td></tr>
    <tr><td>Repayment</td><td>${loan.repayment_frequency || 'monthly'}</td><td class="new">${loan.revision_frequency || loan.repayment_frequency || 'monthly'}</td></tr>
    <tr><td>Installment</td><td>${fmt(currentInstallment)}</td><td class="new">${fmt(loan.revision_installment)}</td></tr>
    <tr><td>Total repayable</td><td>${fmt(loan.total_repayable)}</td><td class="new">${fmt(loan.revision_total_repayable)}</td></tr>
    <tr><td>Interest rate</td><td colspan="2">${loan.interest_rate || '—'}% per month (flat), applied to the revised principal</td></tr>
  </table>

  <h2>C. Reason for the revision</h2>
  <div class="note">${loan.revision_note || '—'}</div>

  <h2>D. Applicant declaration</h2>
  <div class="note">
    I, <b>${loan.employee_name}</b>, confirm that the revised terms above have been explained to me and that I accept them in
    full. I understand that these revised terms replace the terms of my original loan application, and that recovery may be made
    from my salary, wallet, allowances and terminal benefits, including the creation of a wallet overdraft where funds are short.
    The loan is only disbursed after final management approval.
  </div>

  <div class="sig">
    <div>Applicant: ${loan.employee_name} — Signature &amp; Date</div>
    <div>For the Company: ${loan.revision_by || 'Authorised Approver'} — Signature &amp; Date</div>
  </div>
  </body></html>`);
  w.document.close();
  w.print();
};
