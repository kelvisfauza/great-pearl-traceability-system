import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Printer, ShieldCheck } from 'lucide-react';

export const LOAN_TERMS_VERSION = 'v2026.08';

export interface LoanTermsApplication {
  loanTypeLabel: string;
  loanType: string;
  requestedAmount: number;
  evaluationFee: number;
  principal: number;
  monthlyRate: number;
  dailyRate: number;
  maxRate: number;
  durationMonths: number;
  frequency: string;
  numInstallments: number;
  installmentAmount: number;
  totalInterest: number;
  totalRepayable: number;
  firstRepaymentDate: string;
  borrowerName: string;
  borrowerEmail: string;
  borrowerPhone?: string;
  borrowerPosition?: string;
  borrowerDepartment?: string;
  borrowerSalary?: number;
  guarantors: { name: string; email?: string; phone?: string }[];
  purpose?: string;
}

const fmt = (n: number) => `UGX ${Math.round(n || 0).toLocaleString()}`;

export const buildLoanTerms = (a: LoanTermsApplication): { title: string; body: string }[] => [
  {
    title: '1. Parties & Nature of the Facility',
    body: `This agreement is between YEDA Coffee Company Limited (trading as Great Agro Coffee), P.O Box 431420, Kasese, Uganda ("the Company", "Lender") and ${a.borrowerName} (${a.borrowerEmail}), an employee of the Company ("the Borrower"). The facility is a ${a.loanTypeLabel} of ${fmt(a.principal)} advanced strictly as an employee staff facility and is not a public or commercial banking product.`,
  },
  {
    title: '2. Principal, Fees & Interest',
    body: `The requested amount is ${fmt(a.requestedAmount)}. A non-refundable evaluation/processing fee of ${fmt(a.evaluationFee)} is capitalised into the principal, bringing the contractual principal to ${fmt(a.principal)}. Interest accrues at ${a.monthlyRate}% per month (approximately ${a.dailyRate.toFixed(3)}% per day) on a flat basis, with total interest over the life of the loan capped at ${a.maxRate}% of principal. Total interest payable on this facility is ${fmt(a.totalInterest)} and the total amount repayable is ${fmt(a.totalRepayable)}.`,
  },
  {
    title: '3. Repayment Schedule',
    body: `Repayment is ${a.frequency} in ${a.numInstallments} installment(s) of approximately ${fmt(a.installmentAmount)} each over ${a.durationMonths} month(s). The first repayment falls due on ${a.firstRepaymentDate}. The Borrower authorises the Company to collect installments automatically from the Borrower's system wallet, salary, allowances, bonuses, per diem, loyalty balance and any other credit due to the Borrower, on or after each due date, without further notice.`,
  },
  {
    title: '4. Salary & Wallet Deduction Mandate',
    body: `The Borrower irrevocably authorises the Company to deduct amounts due from monthly salary at payroll run, and to debit the Borrower's wallet at any time a due installment remains unpaid. Where the wallet has insufficient funds, the Borrower consents to an overdraft being created on the wallet to settle the installment, together with the applicable overdraft access fee and daily overdraft charges as published in the system.`,
  },
  {
    title: '5. Late Payment & Default',
    body: `A late payment penalty of 20% of the overdue installment applies for each overdue week, to a maximum of two weeks (40%). A loan remains in arrears until the full overdue amount plus penalties is cleared. Persistent non-payment renders the entire outstanding balance immediately due and payable, marks the Borrower as a defaulter in the system, and blocks the Borrower from all future facilities, bonuses, investment products and salary advances until cleared.`,
  },
  {
    title: '6. Guarantors & Recovery',
    body: a.guarantors.length
      ? `This facility is guaranteed by ${a.guarantors.map(g => `${g.name}${g.phone ? ` (${g.phone})` : ''}`).join(' and ')}. Each guarantor accepts joint and several liability for the full outstanding balance. Where the Borrower fails to pay, the Company may recover the outstanding amount, in sequence, from the guarantors' wallets, salaries and other entitlements without prior notice. The Borrower indemnifies the Company against any dispute arising from such recovery and accepts a 10% penalty on the recovered amount where recovery from a guarantor is successfully appealed by that guarantor.`
      : 'This facility is unsecured and requires no guarantor; recovery is made directly from the Borrower\'s salary and wallet.',
  },
  {
    title: '7. Early Repayment',
    body: 'The Borrower may repay early at any time via mobile money or wallet. Early settlement is computed on daily pro-rata interest for the days the funds were actually held, so early repayment reduces the interest payable. The capitalised evaluation fee is never refundable.',
  },
  {
    title: '8. Evaluation, Limits & Accuracy of Information',
    body: 'The approved limit is set by the Company\'s automated credit evaluation, which considers salary, tenure, wallet behaviour, existing debt, repayment history, guarantor capacity and guarantor conduct. The Borrower warrants that all information supplied (including business purpose, guarantor consent and contact details) is true and complete. False or misleading information is grounds for immediate cancellation, recall of the full balance and disciplinary action.',
  },
  {
    title: '9. Business Loan Specific Conditions',
    body: 'For the Employee Business Loan, funds must be used for the stated income-generating activity and not for onward lending. The limit is derived from the combined capacity of two qualifying guarantors, not from salary alone. The Company may request evidence of the business activity at any time. Guarantors with defaults, overdue loans or negative wallets do not qualify.',
  },
  {
    title: '10. Exit, Termination & Set-Off',
    body: 'If the Borrower resigns, is terminated, abandons duty or their contract expires while any balance remains outstanding, the entire balance becomes immediately due and the Company may set it off in full against final salary, gratuity, leave pay, wallet balance and any other terminal benefits, with the shortfall remaining recoverable from the Borrower and the guarantors.',
  },
  {
    title: '11. Data, Notifications & Records',
    body: 'The Borrower consents to the processing of their employment, payroll, wallet and repayment data for credit assessment and recovery, and to receiving SMS and email notices about this loan. System-generated records, ledgers and statements are conclusive evidence of amounts owing in the absence of manifest error. Electronic acceptance of these terms carries the same legal effect as a handwritten signature.',
  },
  {
    title: '12. Governing Law & Disputes',
    body: 'This agreement is governed by the laws of the Republic of Uganda. Disputes are first referred to the Company\'s internal loan appeals panel; if unresolved within 30 days, either party may pursue the matter before the competent courts of Uganda.',
  },
];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  application: LoanTermsApplication | null;
  submitting?: boolean;
  onAccept: (meta: { version: string; signature: string; acceptedAt: string }) => void;
}

const LoanTermsDialog: React.FC<Props> = ({ open, onOpenChange, application, submitting, onAccept }) => {
  const [agreed, setAgreed] = useState(false);
  const [deductionOk, setDeductionOk] = useState(false);
  const [truthful, setTruthful] = useState(false);
  const [signature, setSignature] = useState('');

  const terms = useMemo(() => (application ? buildLoanTerms(application) : []), [application]);
  if (!application) return null;

  const a = application;
  const nameMatches = signature.trim().toLowerCase() === a.borrowerName.trim().toLowerCase();
  const canAccept = agreed && deductionOk && truthful && nameMatches && !submitting;

  const printForm = () => {
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) return;
    w.document.write(`<html><head><title>Loan Application Form – ${a.borrowerName}</title>
    <style>body{font-family:Georgia,serif;padding:28px;color:#111;font-size:12px;line-height:1.5}
    h1{font-size:17px;margin:0}h2{font-size:13px;margin:16px 0 6px;border-bottom:1px solid #999;padding-bottom:3px}
    .head{text-align:center;border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:14px}
    table{width:100%;border-collapse:collapse;margin-bottom:8px}td{padding:4px 6px;border:1px solid #ccc}
    td.l{background:#f4f4f4;width:34%;font-weight:bold}
    .t{margin-bottom:8px}.t b{display:block}
    .sig{margin-top:24px;display:flex;justify-content:space-between}
    .sig div{width:45%;border-top:1px solid #111;padding-top:4px;font-size:11px}
    </style></head><body>
    <div class="head"><h1>YEDA COFFEE COMPANY LIMITED</h1>
    <div>Great Agro Coffee • P.O Box 431420, Kasese, Uganda • Operations: +256393101103</div>
    <div style="margin-top:6px;font-weight:bold">STAFF LOAN APPLICATION &amp; AGREEMENT FORM (${LOAN_TERMS_VERSION})</div></div>
    <h2>A. Applicant Details</h2>
    <table>
      <tr><td class="l">Full Name</td><td>${a.borrowerName}</td><td class="l">Email</td><td>${a.borrowerEmail}</td></tr>
      <tr><td class="l">Phone</td><td>${a.borrowerPhone || '-'}</td><td class="l">Department</td><td>${a.borrowerDepartment || '-'}</td></tr>
      <tr><td class="l">Position</td><td>${a.borrowerPosition || '-'}</td><td class="l">Monthly Salary</td><td>${a.borrowerSalary ? fmt(a.borrowerSalary) : '-'}</td></tr>
    </table>
    <h2>B. Facility Applied For</h2>
    <table>
      <tr><td class="l">Loan Product</td><td>${a.loanTypeLabel}</td><td class="l">Requested Amount</td><td>${fmt(a.requestedAmount)}</td></tr>
      <tr><td class="l">Evaluation Fee (capitalised)</td><td>${fmt(a.evaluationFee)}</td><td class="l">Contract Principal</td><td>${fmt(a.principal)}</td></tr>
      <tr><td class="l">Interest Rate</td><td>${a.monthlyRate}% / month (${a.dailyRate.toFixed(3)}% / day)</td><td class="l">Interest Cap</td><td>${a.maxRate}% of principal</td></tr>
      <tr><td class="l">Duration</td><td>${a.durationMonths} month(s)</td><td class="l">Repayment</td><td>${a.frequency}, ${a.numInstallments} installment(s)</td></tr>
      <tr><td class="l">Installment</td><td>${fmt(a.installmentAmount)}</td><td class="l">First Due Date</td><td>${a.firstRepaymentDate}</td></tr>
      <tr><td class="l">Total Interest</td><td>${fmt(a.totalInterest)}</td><td class="l">Total Repayable</td><td><b>${fmt(a.totalRepayable)}</b></td></tr>
      ${a.purpose ? `<tr><td class="l">Purpose</td><td colspan="3">${a.purpose}</td></tr>` : ''}
    </table>
    <h2>C. Guarantors</h2>
    <table>${a.guarantors.length ? a.guarantors.map((g, i) => `<tr><td class="l">Guarantor ${i + 1}</td><td>${g.name}</td><td class="l">Contact</td><td>${g.phone || g.email || '-'}</td></tr>`).join('') : '<tr><td colspan="4">No guarantor required for this product.</td></tr>'}</table>
    <h2>D. Terms &amp; Conditions</h2>
    ${terms.map(t => `<div class="t"><b>${t.title}</b>${t.body}</div>`).join('')}
    <h2>E. Declaration</h2>
    <div class="t">I confirm that I have read, understood and accepted the terms above; that the information given is true; and that I authorise salary and wallet deductions (including overdraft creation) for the recovery of this facility.</div>
    <div class="sig"><div>Applicant: ${a.borrowerName} — Date: ${new Date().toLocaleDateString()}</div><div>For the Company (Authorised Approver)</div></div>
    </body></html>`);
    w.document.close();
    w.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" /> Loan Application Form & Terms
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-3">
          <div className="space-y-4 text-sm">
            <div className="rounded-lg border p-3">
              <div className="font-semibold mb-2">A. Applicant</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <span className="text-muted-foreground">Name</span><span>{a.borrowerName}</span>
                <span className="text-muted-foreground">Email</span><span>{a.borrowerEmail}</span>
                <span className="text-muted-foreground">Phone</span><span>{a.borrowerPhone || '-'}</span>
                <span className="text-muted-foreground">Department</span><span>{a.borrowerDepartment || '-'}</span>
                <span className="text-muted-foreground">Monthly salary</span><span>{a.borrowerSalary ? fmt(a.borrowerSalary) : '-'}</span>
              </div>
            </div>

            <div className="rounded-lg border p-3">
              <div className="font-semibold mb-2">B. Facility applied for</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <span className="text-muted-foreground">Product</span><span>{a.loanTypeLabel}</span>
                <span className="text-muted-foreground">Requested</span><span>{fmt(a.requestedAmount)}</span>
                <span className="text-muted-foreground">Evaluation fee</span><span>{fmt(a.evaluationFee)} (added to principal)</span>
                <span className="text-muted-foreground">Principal</span><span>{fmt(a.principal)}</span>
                <span className="text-muted-foreground">Interest</span><span>{a.monthlyRate}%/month ({a.dailyRate.toFixed(3)}%/day), cap {a.maxRate}%</span>
                <span className="text-muted-foreground">Duration</span><span>{a.durationMonths} month(s)</span>
                <span className="text-muted-foreground">Repayment</span><span>{a.frequency} — {a.numInstallments} × {fmt(a.installmentAmount)}</span>
                <span className="text-muted-foreground">First due</span><span>{a.firstRepaymentDate}</span>
                <span className="text-muted-foreground">Total interest</span><span>{fmt(a.totalInterest)}</span>
                <span className="text-muted-foreground font-semibold">Total repayable</span><span className="font-semibold">{fmt(a.totalRepayable)}</span>
              </div>
            </div>

            <div className="rounded-lg border p-3">
              <div className="font-semibold mb-2">C. Guarantors</div>
              {a.guarantors.length ? (
                <ul className="text-xs list-disc pl-4 space-y-1">
                  {a.guarantors.map((g, i) => <li key={i}>{g.name} {g.phone ? `— ${g.phone}` : ''}</li>)}
                </ul>
              ) : <p className="text-xs text-muted-foreground">No guarantor required for this product.</p>}
            </div>

            <div className="rounded-lg border p-3">
              <div className="font-semibold mb-2">D. Terms & Conditions ({LOAN_TERMS_VERSION})</div>
              <div className="space-y-3 text-xs leading-relaxed">
                {terms.map(t => (
                  <div key={t.title}>
                    <div className="font-semibold">{t.title}</div>
                    <p className="text-muted-foreground">{t.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="border-t pt-3 space-y-3">
          <label className="flex items-start gap-2 text-xs">
            <Checkbox checked={agreed} onCheckedChange={(v) => setAgreed(!!v)} />
            <span>I have read and accept all the terms and conditions of this {a.loanTypeLabel}, including interest, penalties and default consequences.</span>
          </label>
          <label className="flex items-start gap-2 text-xs">
            <Checkbox checked={deductionOk} onCheckedChange={(v) => setDeductionOk(!!v)} />
            <span>I authorise recovery from my salary, wallet, allowances and terminal benefits, including creation of a wallet overdraft where funds are short.</span>
          </label>
          <label className="flex items-start gap-2 text-xs">
            <Checkbox checked={truthful} onCheckedChange={(v) => setTruthful(!!v)} />
            <span>I confirm the information in this application is true and my guarantor(s) consented to stand for me.</span>
          </label>
          <div className="space-y-1">
            <Label className="text-xs">Type your full name to sign electronically</Label>
            <Input value={signature} onChange={(e) => setSignature(e.target.value)} placeholder={a.borrowerName} />
            {signature && !nameMatches && <p className="text-[11px] text-destructive">Name must match exactly: {a.borrowerName}</p>}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={printForm}>
              <Printer className="mr-2 h-4 w-4" /> Print / Save Form
            </Button>
            <Button
              className="flex-1"
              disabled={!canAccept}
              onClick={() => onAccept({ version: LOAN_TERMS_VERSION, signature: signature.trim(), acceptedAt: new Date().toISOString() })}
            >
              {submitting ? 'Submitting...' : 'Accept & Submit Application'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LoanTermsDialog;
