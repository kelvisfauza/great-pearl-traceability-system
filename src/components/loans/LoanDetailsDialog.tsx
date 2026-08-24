import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Printer, Loader2, User, Shield, Banknote, Calendar } from 'lucide-react';

const LOAN_LABELS: Record<string, string> = {
  quick: 'Quick Loan',
  long_term: 'Long-Term Loan',
  pure_salary: 'Pure Salary Loan',
  business: 'Employee Business Loan',
};

const money = (n: any) => `UGX ${Number(n || 0).toLocaleString()}`;
const day = (d: any) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const dayTime = (d: any) => (d ? new Date(d).toLocaleString('en-GB') : '—');

interface Props {
  loan: any;
  open: boolean;
  onClose: () => void;
}

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex justify-between gap-4 py-1 border-b border-dashed last:border-0">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className="text-xs font-medium text-right">{value}</span>
  </div>
);

const LoanDetailsDialog = ({ loan, open, onClose }: Props) => {
  const [loading, setLoading] = useState(true);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [evaluation, setEvaluation] = useState<any>(null);
  const [borrower, setBorrower] = useState<any>(null);

  useEffect(() => {
    if (!open || !loan) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [reps, evalByLoan, emp] = await Promise.all([
          supabase.from('loan_repayments').select('*').eq('loan_id', loan.id).order('installment_number', { ascending: true }),
          (supabase as any).from('loan_evaluations').select('*').eq('applied_loan_id', loan.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('employees').select('name, email, phone, salary, department, position, employee_id, join_date, status').eq('email', loan.employee_email).maybeSingle(),
        ]);
        let ev = (evalByLoan as any)?.data || null;
        if (!ev && loan.employee_email) {
          const { data } = await (supabase as any)
            .from('loan_evaluations').select('*').eq('employee_email', loan.employee_email)
            .order('created_at', { ascending: false }).limit(1).maybeSingle();
          ev = data;
        }
        if (cancelled) return;
        setSchedule((reps.data as any[]) || []);
        setEvaluation(ev);
        setBorrower((emp as any)?.data || null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, loan?.id]);

  if (!loan) return null;

  const typeLabel = LOAN_LABELS[loan.loan_type || 'quick'] || loan.loan_type;
  const needsG2 = !!loan.guarantor2_email;
  const totalPaid = schedule.reduce((s, r) => s + (r.amount_paid || 0), 0);
  const awaiting = loan.status === 'pending_guarantor'
    ? (!loan.guarantor_approved ? `${loan.guarantor_name || 'Guarantor 1'} (Guarantor 1)` : needsG2 && !loan.guarantor2_approved ? `${loan.guarantor2_name || 'Guarantor 2'} (Guarantor 2)` : 'Guarantor')
    : loan.status === 'pending_admin' ? 'Administrator'
    : loan.status === 'counter_offered' ? `${loan.employee_name} (borrower response)`
    : 'No action pending';

  const isApproved = !!(loan.admin_approved || loan.admin_approved_at || loan.approved_at || ['approved', 'active', 'disbursed', 'completed', 'overdue'].includes(loan.status));
  const approvedAmount = isApproved ? (loan.disbursed_amount || loan.loan_amount) : null;

  const prettyLabel = (k: string) => k.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
  const prettyValue = (v: any) => {
    if (v === null || v === undefined || v === '') return '—';
    if (typeof v === 'boolean') return v ? 'Yes' : 'No';
    if (typeof v === 'number') return v > 9999 ? money(v) : String(v);
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  };
  const toList = (obj: any): { label: string; value: string }[] => {
    if (!obj) return [];
    if (Array.isArray(obj)) return obj.map((x, i) => typeof x === 'object' && x
      ? { label: prettyLabel(String(x.label ?? x.name ?? x.factor ?? `Item ${i + 1}`)), value: prettyValue(x.value ?? x.score ?? x.detail ?? x.status) }
      : { label: `Item ${i + 1}`, value: prettyValue(x) });
    if (typeof obj === 'object') return Object.entries(obj).map(([k, v]) => ({ label: prettyLabel(k), value: prettyValue(v) }));
    return [];
  };
  const factorList = toList(evaluation?.factors);
  const historyList = toList(evaluation?.history_summary);

  const gStatus = (approved: boolean, declined: boolean) =>
    approved ? <Badge className="text-[10px]">Approved</Badge>
      : declined ? <Badge variant="destructive" className="text-[10px]">Declined</Badge>
      : <Badge variant="outline" className="text-[10px]">Pending</Badge>;

  const handlePrint = () => {
    const win = window.open('', '_blank', 'width=900,height=1000');
    if (!win) return;
    const rows = schedule.map(r => `<tr><td>${r.installment_number}</td><td>${day(r.due_date)}</td><td>${money(r.amount_due)}</td><td>${money(r.amount_paid)}</td><td>${r.status}</td></tr>`).join('');
    win.document.write(`<!doctype html><html><head><title>Loan Review – ${loan.employee_name}</title>
      <style>body{font:12px/1.5 system-ui;padding:24px;color:#111}h1{font-size:18px;margin:0 0 4px}h2{font-size:13px;margin:16px 0 6px;border-bottom:1px solid #ccc;padding-bottom:3px}
      table{width:100%;border-collapse:collapse;margin-top:6px}th,td{border:1px solid #ccc;padding:4px 6px;text-align:left;font-size:11px}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:2px 24px}.r{display:flex;justify-content:space-between;border-bottom:1px dotted #ddd;padding:2px 0}
      .sign{margin-top:36px;display:grid;grid-template-columns:1fr 1fr;gap:32px}</style></head><body>
      <h1>Loan Review Form — Great Agro Coffee</h1>
      <div>Member of YEDA Coffee Company Limited • Printed ${dayTime(new Date())}</div>
      <h2>Borrower</h2><div class="grid">
        <div class="r"><span>Name</span><b>${loan.employee_name || '—'}</b></div>
        <div class="r"><span>Email</span><b>${loan.employee_email || '—'}</b></div>
        <div class="r"><span>Phone</span><b>${loan.employee_phone || borrower?.phone || '—'}</b></div>
        <div class="r"><span>Department</span><b>${borrower?.department || '—'}</b></div>
        <div class="r"><span>Position</span><b>${borrower?.position || '—'}</b></div>
        <div class="r"><span>Monthly salary</span><b>${money(borrower?.salary)}</b></div>
      </div>
      <h2>Loan</h2><div class="grid">
        <div class="r"><span>Loan type</span><b>${typeLabel}</b></div>
        <div class="r"><span>Status</span><b>${loan.status}</b></div>
        <div class="r"><span>Principal</span><b>${money(loan.loan_amount)}</b></div>
        <div class="r"><span>Interest rate</span><b>${loan.interest_rate}% / month</b></div>
        <div class="r"><span>Duration</span><b>${loan.duration_months} months (${loan.repayment_frequency || 'monthly'})</b></div>
        <div class="r"><span>Total repayable</span><b>${money(loan.total_repayable)}</b></div>
        <div class="r"><span>Installment</span><b>${money(loan.weekly_installment || loan.monthly_installment)}</b></div>
        <div class="r"><span>Remaining balance</span><b>${money(loan.remaining_balance)}</b></div>
        <div class="r"><span>Applied on</span><b>${dayTime(loan.created_at)}</b></div>
        <div class="r"><span>Awaiting</span><b>${awaiting}</b></div>
      </div>
      <h2>Guarantors</h2><div class="grid">
        <div class="r"><span>Guarantor 1</span><b>${loan.guarantor_name || '—'} — ${loan.guarantor_approved ? 'Approved' : loan.guarantor_declined ? 'Declined' : 'Pending'}</b></div>
        <div class="r"><span>Contact</span><b>${loan.guarantor_phone || loan.guarantor_email || '—'}</b></div>
        ${needsG2 ? `<div class="r"><span>Guarantor 2</span><b>${loan.guarantor2_name} — ${loan.guarantor2_approved ? 'Approved' : loan.guarantor2_declined ? 'Declined' : 'Pending'}</b></div>
        <div class="r"><span>Contact</span><b>${loan.guarantor2_phone || loan.guarantor2_email || '—'}</b></div>` : ''}
      </div>
      <h2>Amounts &amp; approval</h2><div class="grid">
        <div class="r"><span>Amount requested</span><b>${money(loan.original_loan_amount || loan.loan_amount)}</b></div>
        ${loan.counter_offer_amount ? `<div class="r"><span>Counter-offer</span><b>${money(loan.counter_offer_amount)}</b></div>` : ''}
        <div class="r"><span>Approved amount</span><b>${approvedAmount != null ? money(approvedAmount) : 'Not yet approved'}</b></div>
        <div class="r"><span>Disbursed amount</span><b>${loan.disbursed_amount ? money(loan.disbursed_amount) : 'Not disbursed'}</b></div>
        <div class="r"><span>Approved by</span><b>${loan.admin_approved_by || loan.approved_by || '—'}</b></div>
        <div class="r"><span>Approved on</span><b>${dayTime(loan.admin_approved_at || loan.approved_at)}</b></div>
      </div>
      ${evaluation ? `<h2>System evaluation report</h2><div class="grid">
        <div class="r"><span>Decision</span><b>${evaluation.decision || '—'}</b></div>
        <div class="r"><span>Risk score</span><b>${evaluation.risk_score ?? '—'}</b></div>
        <div class="r"><span>Max eligible limit</span><b>${money(evaluation.max_limit)}</b></div>
        <div class="r"><span>Recommended amount</span><b>${money(evaluation.recommended_amount)}</b></div>
        <div class="r"><span>Recommended type</span><b>${LOAN_LABELS[evaluation.recommended_loan_type] || evaluation.recommended_loan_type || '—'}</b></div>
        <div class="r"><span>Recommended duration</span><b>${evaluation.recommended_duration_months ? `${evaluation.recommended_duration_months} months` : '—'}</b></div>
        <div class="r"><span>Evaluated on</span><b>${dayTime(evaluation.created_at)}</b></div>
        <div class="r"><span>Valid until</span><b>${dayTime(evaluation.valid_until)}</b></div>
      </div>
      ${factorList.length ? `<table><thead><tr><th>Assessment factor</th><th>Value</th></tr></thead><tbody>${factorList.map(f => `<tr><td>${f.label}</td><td>${f.value}</td></tr>`).join('')}</tbody></table>` : ''}
      ${historyList.length ? `<table><thead><tr><th>Borrowing history</th><th>Value</th></tr></thead><tbody>${historyList.map(f => `<tr><td>${f.label}</td><td>${f.value}</td></tr>`).join('')}</tbody></table>` : ''}` : '<h2>System evaluation report</h2><div>No evaluation report was issued for this application.</div>'}
      ${rows ? `<h2>Repayment schedule</h2><table><thead><tr><th>#</th><th>Due date</th><th>Due</th><th>Paid</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>` : ''}
      <div class="sign"><div>Reviewed by (Administrator)<br/><br/>__________________<br/>Name / Date</div><div>Borrower acknowledgement<br/><br/>__________________<br/>Name / Date</div></div>
      </body></html>`);
    win.document.close();
    win.print();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" /> Loan Review Form — {loan.employee_name}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[74vh] px-6 pb-6">
          {loading ? (
            <div className="py-16 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{typeLabel}</Badge>
                <Badge variant="outline">{loan.status}</Badge>
                <Badge variant="outline">Awaiting: {awaiting}</Badge>
                <Button size="sm" variant="outline" className="ml-auto" onClick={handlePrint}>
                  <Printer className="h-3.5 w-3.5 mr-1" /> Print form
                </Button>
              </div>

              {allGuarantorsApproved ? (
                <Card className="border-primary/40">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Shield className="h-4 w-4" /> Signature documents — all guarantors approved
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => printLoanDoc(buildFullLoanTermsPackHtml(loan))}>
                      <Printer className="h-3.5 w-3.5 mr-1" /> Print full terms pack
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => printLoanDoc(buildBorrowerTermsHtml(loan))}>
                      <Printer className="h-3.5 w-3.5 mr-1" /> Borrower T&amp;Cs
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => printLoanDoc(buildGuarantorTermsHtml(loan, 1))}>
                      <Printer className="h-3.5 w-3.5 mr-1" /> Guarantor 1 terms
                    </Button>
                    {needsG2 && (
                      <Button size="sm" variant="outline" onClick={() => printLoanDoc(buildGuarantorTermsHtml(loan, 2))}>
                        <Printer className="h-3.5 w-3.5 mr-1" /> Guarantor 2 terms
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="text-xs text-muted-foreground border rounded-md p-3">
                  Loan terms &amp; guarantor undertakings become printable once all guarantors have approved.
                </div>
              )}


              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><User className="h-4 w-4" /> Borrower</CardTitle></CardHeader>
                  <CardContent className="pt-0">
                    <Row label="Name" value={loan.employee_name} />
                    <Row label="Email" value={loan.employee_email} />
                    <Row label="Phone" value={loan.employee_phone || borrower?.phone || '—'} />
                    <Row label="Employee ID" value={borrower?.employee_id || '—'} />
                    <Row label="Department" value={borrower?.department || '—'} />
                    <Row label="Position" value={borrower?.position || '—'} />
                    <Row label="Monthly salary" value={money(borrower?.salary)} />
                    <Row label="Joined" value={day(borrower?.join_date)} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Banknote className="h-4 w-4" /> Loan terms</CardTitle></CardHeader>
                  <CardContent className="pt-0">
                    <Row label="Loan type" value={typeLabel} />
                    <Row label="Principal (incl. fee)" value={money(loan.loan_amount)} />
                    <Row label="Interest rate" value={`${loan.interest_rate}% / month`} />
                    <Row label="Duration" value={`${loan.duration_months} months • ${loan.repayment_frequency || 'monthly'}`} />
                    <Row label="Total repayable" value={money(loan.total_repayable)} />
                    <Row label="Installment" value={money(loan.weekly_installment || loan.monthly_installment)} />
                    <Row label="Total paid" value={money(totalPaid)} />
                    <Row label="Remaining balance" value={money(loan.remaining_balance)} />
                    {loan.is_topup && <Row label="Top-up" value="Yes" />}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Shield className="h-4 w-4" /> Guarantors &amp; approvals</CardTitle></CardHeader>
                  <CardContent className="pt-0 space-y-2">
                    <div>
                      <div className="text-xs font-semibold">Guarantor 1 {gStatus(!!loan.guarantor_approved, !!loan.guarantor_declined)}</div>
                      <Row label="Name" value={loan.guarantor_name || '—'} />
                      <Row label="Contact" value={loan.guarantor_phone || loan.guarantor_email || '—'} />
                      <Row label="Responded" value={dayTime(loan.guarantor_approved_at)} />
                    </div>
                    {needsG2 && (
                      <div>
                        <div className="text-xs font-semibold">Guarantor 2 {gStatus(!!loan.guarantor2_approved, !!loan.guarantor2_declined)}</div>
                        <Row label="Name" value={loan.guarantor2_name} />
                        <Row label="Contact" value={loan.guarantor2_phone || loan.guarantor2_email || '—'} />
                        <Row label="Responded" value={dayTime(loan.guarantor2_approved_at)} />
                      </div>
                    )}
                    <Row label="Applied on" value={dayTime(loan.created_at)} />
                    <Row label="Admin approved" value={loan.approved_at ? `${dayTime(loan.approved_at)}${loan.approved_by ? ` by ${loan.approved_by}` : ''}` : 'Not yet'} />
                    <Row label="Disbursed" value={dayTime(loan.disbursed_at)} />
                    <Row label="Terms signed" value={loan.terms_accepted ? `${dayTime(loan.terms_accepted_at)} (${loan.terms_version || 'v1'})` : 'No'} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Banknote className="h-4 w-4" /> Amounts &amp; approval</CardTitle></CardHeader>
                  <CardContent className="pt-0">
                    <Row label="Amount requested" value={money(loan.original_loan_amount || loan.loan_amount)} />
                    {loan.counter_offer_amount ? (
                      <Row label="Counter-offer by admin" value={`${money(loan.counter_offer_amount)}${loan.counter_offer_by ? ` • ${loan.counter_offer_by}` : ''}`} />
                    ) : null}
                    <Row label="Approved amount" value={approvedAmount != null ? money(approvedAmount) : 'Not yet approved'} />
                    <Row label="Disbursed amount" value={loan.disbursed_amount ? money(loan.disbursed_amount) : 'Not disbursed'} />
                    <Row label="Approved by" value={loan.admin_approved_by || loan.approved_by || '—'} />
                    <Row label="Approved on" value={dayTime(loan.admin_approved_at || loan.approved_at)} />
                    <Row label="Paid to date" value={money(loan.paid_amount || totalPaid)} />
                    {loan.penalty_amount ? <Row label="Penalties" value={money(loan.penalty_amount)} /> : null}
                    {loan.counter_offer_comments && (
                      <p className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">Admin note: {loan.counter_offer_comments}</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">System evaluation report</CardTitle></CardHeader>
                <CardContent className="pt-0">
                  {evaluation ? (
                    <div className="grid gap-x-8 md:grid-cols-2">
                      <div>
                        <Row label="Decision" value={<span className="uppercase">{evaluation.decision || '—'}</span>} />
                        <Row label="Risk score" value={evaluation.risk_score != null ? `${evaluation.risk_score}/100` : '—'} />
                        <Row label="Max eligible limit" value={money(evaluation.max_limit)} />
                        <Row label="Recommended amount" value={money(evaluation.recommended_amount)} />
                      </div>
                      <div>
                        <Row label="Recommended type" value={LOAN_LABELS[evaluation.recommended_loan_type] || evaluation.recommended_loan_type || '—'} />
                        <Row label="Recommended duration" value={evaluation.recommended_duration_months ? `${evaluation.recommended_duration_months} months` : '—'} />
                        <Row label="Evaluated on" value={dayTime(evaluation.created_at)} />
                        <Row label="Valid until" value={dayTime(evaluation.valid_until)} />
                      </div>
                      {factorList.length > 0 && (
                        <div className="md:col-span-2 mt-3">
                          <p className="text-xs font-semibold mb-1">Assessment factors</p>
                          <ul className="space-y-1">
                            {factorList.map((f, i) => (
                              <li key={i} className="text-xs text-muted-foreground flex justify-between gap-4 border-b border-dashed py-1">
                                <span>{f.label}</span><span className="font-medium text-right">{f.value}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {historyList.length > 0 && (
                        <div className="md:col-span-2 mt-3">
                          <p className="text-xs font-semibold mb-1">Borrowing history summary</p>
                          <ul className="space-y-1">
                            {historyList.map((f, i) => (
                              <li key={i} className="text-xs text-muted-foreground flex justify-between gap-4 border-b border-dashed py-1">
                                <span>{f.label}</span><span className="font-medium text-right">{f.value}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <p className="md:col-span-2 text-[10px] text-muted-foreground mt-3">
                        {evaluation.applied_loan_id === loan.id
                          ? 'Evaluation issued for this application.'
                          : 'Latest evaluation on record for this employee (not tied to this application).'}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No evaluation report was issued for this application.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Calendar className="h-4 w-4" /> Repayment schedule</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead className="text-xs">#</TableHead><TableHead className="text-xs">Due date</TableHead>
                      <TableHead className="text-xs">Amount due</TableHead><TableHead className="text-xs">Paid</TableHead>
                      <TableHead className="text-xs">Balance</TableHead><TableHead className="text-xs">Status</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {schedule.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="text-xs">{r.installment_number}</TableCell>
                          <TableCell className="text-xs">{day(r.due_date)}</TableCell>
                          <TableCell className="text-xs">{money(r.amount_due)}</TableCell>
                          <TableCell className="text-xs">{money(r.amount_paid)}</TableCell>
                          <TableCell className="text-xs">{money((r.amount_due || 0) - (r.amount_paid || 0))}</TableCell>
                          <TableCell className="text-xs capitalize">{r.status === 'pending' && (r.amount_paid || 0) > 0 ? 'partial' : r.status}</TableCell>
                        </TableRow>
                      ))}
                      {schedule.length === 0 && (
                        <TableRow><TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-6">Schedule is generated after approval</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default LoanDetailsDialog;
