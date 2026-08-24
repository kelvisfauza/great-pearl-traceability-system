import { COMPANY_NAME, COMPANY_TAGLINE, COMPANY_ADDRESS, COMPANY_PHONES, COMPANY_EMAIL } from './companyBrand';

const LOAN_LABELS: Record<string, string> = {
  quick: 'Quick Loan',
  long_term: 'Long-Term Loan',
  pure_salary: 'Pure Salary Loan',
  business: 'Employee Business Loan',
};

const money = (n: any) => `UGX ${Number(n || 0).toLocaleString()}`;
const day = (d: any) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '__________');

const BASE_CSS = `
body{font:12px/1.6 Georgia,serif;color:#111;padding:28px 32px;max-width:820px;margin:0 auto}
.hd{border-bottom:2px solid #0d3d1f;padding-bottom:8px;margin-bottom:14px}
.hd h1{font-size:17px;margin:0;color:#0d3d1f;letter-spacing:.5px}
.hd .sub{font-size:10px;color:#555;font-style:italic}
.hd .meta{font-size:10px;color:#555;margin-top:4px}
h2{font-size:13px;margin:18px 0 6px;color:#0d3d1f;border-bottom:1px solid #ccc;padding-bottom:3px}
h3{font-size:12px;margin:0 0 8px;text-align:center;text-transform:uppercase;letter-spacing:1px}
table{width:100%;border-collapse:collapse;margin:6px 0}
th,td{border:1px solid #bbb;padding:5px 7px;text-align:left;font-size:11px}
th{background:#f2f5f2}
ol{padding-left:18px;margin:6px 0}
ol li{margin-bottom:5px;font-size:11.5px}
.dec{background:#f7f9f7;border:1px solid #ddd;padding:8px 10px;margin-top:12px;font-size:11.5px}
.sign{margin-top:26px;display:grid;grid-template-columns:1fr 1fr;gap:26px}
.sign div{font-size:11px}
.line{margin-top:26px;border-bottom:1px solid #333}
.ft{margin-top:22px;border-top:1px solid #ccc;padding-top:6px;font-size:9.5px;color:#666;text-align:center}
@media print{.pb{page-break-after:always}}
`;

const header = (title: string) => `
<div class="hd">
  <h1>${COMPANY_NAME}</h1>
  <div class="sub">${COMPANY_TAGLINE}</div>
  <div class="meta">${COMPANY_ADDRESS} &bull; ${COMPANY_PHONES} &bull; ${COMPANY_EMAIL}</div>
</div>
<h3>${title}</h3>`;

const footer = () => `<div class="ft">${COMPANY_NAME} &mdash; Staff Credit Facility. Printed ${new Date().toLocaleString('en-GB')}. This document must be signed and returned to Administration before disbursement.</div>`;

const loanFacts = (loan: any) => `
<table>
  <tr><th>Loan reference</th><td>LOAN-${String(loan.id || '').substring(0, 8).toUpperCase()}</td><th>Loan product</th><td>${LOAN_LABELS[loan.loan_type] || loan.loan_type || 'Staff Loan'}</td></tr>
  <tr><th>Borrower</th><td>${loan.employee_name || '—'}</td><th>Email / Phone</th><td>${loan.employee_email || '—'}${loan.employee_phone ? ' / ' + loan.employee_phone : ''}</td></tr>
  <tr><th>Principal</th><td>${money(loan.loan_amount)}</td><th>Interest rate</th><td>${loan.interest_rate ?? '—'}% per month</td></tr>
  <tr><th>Total repayable</th><td>${money(loan.total_repayable)}</td><th>Installment</th><td>${money(loan.weekly_installment || loan.monthly_installment)} (${loan.repayment_frequency || 'monthly'})</td></tr>
  <tr><th>Duration</th><td>${loan.duration_months || '—'} month(s)</td><th>Approved on</th><td>${day(loan.admin_approved_at || loan.approved_at)}</td></tr>
</table>`;

export const buildBorrowerTermsHtml = (loan: any) => `<!doctype html><html><head><meta charset="utf-8">
<title>Loan Terms &amp; Conditions – ${loan.employee_name || ''}</title><style>${BASE_CSS}</style></head><body>
${header('Employee Loan Agreement — Terms &amp; Conditions')}
${loanFacts(loan)}
<h2>1. Terms and Conditions</h2>
<ol>
  <li>The Borrower acknowledges receipt of the facility stated above and undertakes to repay the total repayable amount in full, on the agreed schedule, until the balance is cleared.</li>
  <li>Interest accrues at ${loan.interest_rate ?? '—'}% per month on the outstanding principal and is already reflected in the total repayable amount.</li>
  <li>Repayments are recovered automatically from the Borrower's company wallet, salary, per diem, allowances, bonuses and any other credit due to the Borrower on each due date.</li>
  <li>Where the wallet balance is insufficient on a due date, the Company may place the wallet into overdraft and apply the prevailing overdraft access and maintenance fees.</li>
  <li>Where an installment remains unpaid, the Company may recover the outstanding amount from the wallet(s) of the Guarantor(s) named in this agreement, without further notice.</li>
  <li>Early repayment is permitted and attracts a pro-rata interest discount computed at the date of settlement.</li>
  <li>Default on three (3) or more consecutive installments constitutes an event of default and may trigger full guarantor liability, salary deduction, suspension of further credit and disciplinary action.</li>
  <li>The Borrower authorises the Company to deduct any outstanding balance from terminal benefits, final salary or any other sums payable on resignation, termination or end of contract.</li>
  <li>The Borrower shall promptly notify Administration of any change in employment status, salary, contact details or ability to repay.</li>
  <li>This agreement is governed by the laws of the Republic of Uganda and is binding upon signature and disbursement.</li>
</ol>
<div class="dec"><b>Borrower declaration:</b> I, ${loan.employee_name || '____________________'}, confirm that I have read and understood the terms and conditions above, that the information supplied in my application is true, and that I accept the repayment obligations of this facility.</div>
<div class="sign">
  <div>Borrower<div class="line"></div>Name, signature &amp; date</div>
  <div>Witness / Administrator<div class="line"></div>Name, signature &amp; date</div>
</div>
${footer()}
</body></html>`;

export const buildGuarantorTermsHtml = (loan: any, slot: 1 | 2) => {
  const g = slot === 1
    ? { name: loan.guarantor_name, email: loan.guarantor_email, phone: loan.guarantor_phone, at: loan.guarantor_approved_at }
    : { name: loan.guarantor2_name, email: loan.guarantor2_email, phone: loan.guarantor2_phone, at: loan.guarantor2_approved_at };
  return `<!doctype html><html><head><meta charset="utf-8">
<title>Guarantor Terms – ${g.name || ''}</title><style>${BASE_CSS}</style></head><body>
${header(`Guarantor Undertaking &amp; Terms — Guarantor ${slot}`)}
${loanFacts(loan)}
<table>
  <tr><th>Guarantor name</th><td>${g.name || '—'}</td><th>Slot</th><td>Guarantor ${slot}</td></tr>
  <tr><th>Email / Phone</th><td>${g.email || '—'}${g.phone ? ' / ' + g.phone : ''}</td><th>Consent given on</th><td>${day(g.at)}</td></tr>
</table>
<h2>1. Guarantor Terms and Conditions</h2>
<ol>
  <li>The Guarantor guarantees, jointly and severally with any other guarantor of this facility, the full and punctual repayment of ${money(loan.total_repayable)} owed by the Borrower.</li>
  <li>The Guarantor confirms that the electronic consent given through the company system with a personal approval code constitutes a valid and binding acceptance of this guarantee.</li>
  <li>Where the Borrower fails to meet an installment, the Company may recover the unpaid amount directly from the Guarantor's company wallet, salary, allowances, bonuses or any other sums payable to the Guarantor, without prior notice.</li>
  <li>Recovery from the Guarantor may place the Guarantor's wallet into overdraft, and the prevailing overdraft access and maintenance fees shall apply.</li>
  <li>The Guarantor's guarantee exposure reduces the Guarantor's own borrowing capacity for the duration of this facility.</li>
  <li>Amounts recovered from the Guarantor become a debt of the Borrower to the Guarantor; the Guarantor may lodge a recovery appeal through the system for review by Administration.</li>
  <li>This guarantee remains in force until the facility is fully settled and cannot be withdrawn unilaterally after disbursement.</li>
  <li>The Guarantor authorises the Company to deduct any amount recovered under this guarantee from terminal benefits or final salary should employment end before the facility is cleared.</li>
  <li>The Guarantor confirms having no undisclosed default, overdue loan or existing guarantee that would impair the capacity to honour this undertaking.</li>
  <li>This undertaking is governed by the laws of the Republic of Uganda.</li>
</ol>
<div class="dec"><b>Guarantor declaration:</b> I, ${g.name || '____________________'}, agree to stand as Guarantor ${slot} for the facility described above and accept the terms and conditions set out in this undertaking.</div>
<div class="sign">
  <div>Guarantor ${slot}<div class="line"></div>Name, signature &amp; date</div>
  <div>Witness / Administrator<div class="line"></div>Name, signature &amp; date</div>
</div>
${footer()}
</body></html>`;
};

/** Borrower T&Cs followed by one undertaking per guarantor, in a single print job. */
export const buildFullLoanTermsPackHtml = (loan: any) => {
  const strip = (html: string) => html.replace(/^[\s\S]*?<body>/, '').replace(/<\/body>[\s\S]*$/, '');
  const parts = [strip(buildBorrowerTermsHtml(loan))];
  if (loan.guarantor_name || loan.guarantor_email) parts.push(strip(buildGuarantorTermsHtml(loan, 1)));
  if (loan.guarantor2_name || loan.guarantor2_email) parts.push(strip(buildGuarantorTermsHtml(loan, 2)));
  return `<!doctype html><html><head><meta charset="utf-8">
<title>Loan Terms Pack – ${loan.employee_name || ''}</title><style>${BASE_CSS}</style></head><body>
${parts.map((p, i) => `<div class="${i < parts.length - 1 ? 'pb' : ''}">${p}</div>`).join('')}
</body></html>`;
};

export const printLoanDoc = (html: string) => {
  const win = window.open('', '_blank', 'width=900,height=1000');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.print();
};
