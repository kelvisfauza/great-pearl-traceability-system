import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, XCircle, User, Wallet, Shield, Calendar, AlertTriangle, TrendingUp, Banknote, Printer, HandCoins } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface LoanReviewModalProps {
  loan: any;
  open: boolean;
  onClose: () => void;
  onApprove: (loanId: string) => void;
  onReject: (loanId: string, reason: string) => void;
  onCounterOffer?: (loanId: string, amount: number, comments: string) => void;
  submitting: boolean;
}

const LoanReviewModal = ({ loan, open, onClose, onApprove, onReject, onCounterOffer, submitting }: LoanReviewModalProps) => {
  const [rejectionReason, setRejectionReason] = useState('');
  const [counterOfferAmount, setCounterOfferAmount] = useState('');
  const [counterOfferComments, setCounterOfferComments] = useState('');
  const [showCounterOffer, setShowCounterOffer] = useState(false);
  const [borrowerDetails, setBorrowerDetails] = useState<any>(null);
  const [guarantorDetails, setGuarantorDetails] = useState<any>(null);
  const [borrowerLoans, setBorrowerLoans] = useState<any[]>([]);
  const [guarantorLoans, setGuarantorLoans] = useState<any[]>([]);
  const [borrowerLedger, setBorrowerLedger] = useState<any[]>([]);
  const [borrowerWalletBalance, setBorrowerWalletBalance] = useState(0);
  const [guarantorWalletBalance, setGuarantorWalletBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && loan) {
      fetchReviewData();
    }
  }, [open, loan]);

  const fetchReviewData = async () => {
    if (!loan) return;
    setLoading(true);
    try {
      // Fetch borrower employee details
      const { data: borrower } = await supabase
        .from('employees')
        .select('name, email, phone, salary, department, position, join_date, auth_user_id, address, emergency_contact, employee_id, status, role')
        .eq('email', loan.employee_email)
        .single();
      setBorrowerDetails(borrower);

      // Fetch guarantor employee details
      if (loan.guarantor_email) {
        const { data: guarantor } = await supabase
          .from('employees')
          .select('name, email, phone, salary, department, position, join_date, auth_user_id, employee_id, status, role')
          .eq('email', loan.guarantor_email)
          .single();
        setGuarantorDetails(guarantor);

        // Fetch guarantor wallet balance
        if (guarantor?.auth_user_id) {
          const { data: gUserId } = await supabase.rpc('get_unified_user_id', { input_email: loan.guarantor_email });
          const gUid = gUserId || guarantor.auth_user_id;
          const { data: gWalletLedger } = await supabase
            .from('ledger_entries')
            .select('amount, entry_type')
            .eq('user_id', gUid)
            .in('entry_type', ['LOYALTY_REWARD', 'BONUS', 'DEPOSIT', 'WITHDRAWAL', 'ADJUSTMENT']);
          const gBal = (gWalletLedger || []).reduce((sum: number, e: any) => sum + Number(e.amount), 0);
          setGuarantorWalletBalance(gBal);
        }
      }

      // Fetch borrower's loan history
      const { data: bLoans } = await supabase
        .from('loans')
        .select('*')
        .eq('employee_email', loan.employee_email)
        .neq('id', loan.id)
        .order('created_at', { ascending: false })
        .limit(10);
      setBorrowerLoans(bLoans || []);

      // Fetch guarantor's active loans (as borrower AND as guarantor)
      if (loan.guarantor_email) {
        const { data: gLoans } = await supabase
          .from('loans')
          .select('*')
          .or(`employee_email.eq.${loan.guarantor_email},guarantor_email.eq.${loan.guarantor_email}`)
          .in('status', ['active', 'pending_admin', 'pending_guarantor'])
          .order('created_at', { ascending: false });
        setGuarantorLoans(gLoans || []);
      }

      // Fetch borrower's recent ledger activity and compute loyalty wallet balance
      if (borrower?.auth_user_id) {
        const { data: userId } = await supabase.rpc('get_unified_user_id', { input_email: loan.employee_email });
        const uid = userId || borrower.auth_user_id;
        
        // Fetch recent ledger for display
        const { data: ledger } = await supabase
          .from('ledger_entries')
          .select('*')
          .eq('user_id', uid)
          .order('created_at', { ascending: false })
          .limit(15);
        setBorrowerLedger(ledger || []);

        // Compute loyalty wallet balance
        const { data: walletLedger } = await supabase
          .from('ledger_entries')
          .select('amount, entry_type')
          .eq('user_id', uid)
          .in('entry_type', ['LOYALTY_REWARD', 'BONUS', 'DEPOSIT', 'WITHDRAWAL', 'ADJUSTMENT']);
        
        const walletBal = (walletLedger || []).reduce((sum: number, e: any) => sum + Number(e.amount), 0);
        setBorrowerWalletBalance(walletBal);
      }
    } catch (err) {
      console.error('Error fetching review data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!loan) return null;

  const existingActiveLoans = borrowerLoans.filter(l => ['active', 'pending_admin', 'pending_guarantor'].includes(l.status));
  const totalOutstanding = existingActiveLoans.reduce((sum, l) => sum + (l.remaining_balance || 0), 0);
  const totalMonthlyObligations = existingActiveLoans
    .filter(l => l.status === 'active')
    .reduce((sum, l) => sum + (l.monthly_installment || 0), 0);

  const isWeekly = loan.repayment_frequency === 'weekly';
  const isBullet = loan.repayment_frequency === 'bullet';
  const numInstallments = isWeekly 
    ? (loan.total_weeks || Math.ceil((loan.duration_months * 30) / 7))
    : (isBullet ? 1 : loan.duration_months);
  const installmentAmount = loan.monthly_installment || Math.ceil(loan.total_repayable / numInstallments);
  const totalMonthlyAfterApproval = totalMonthlyObligations + (isWeekly ? installmentAmount * 4 : installmentAmount);
  const salary = borrowerDetails?.salary || 0;
  const debtToIncomeRatio = salary > 0 ? ((totalMonthlyAfterApproval / salary) * 100).toFixed(1) : 'N/A';
  const loanLimit = salary * 2;
  const availableLoanLimit = Math.max(0, loanLimit - totalOutstanding);

  const tenureMonths = borrowerDetails?.join_date
    ? Math.floor((Date.now() - new Date(borrowerDetails.join_date).getTime()) / (1000 * 60 * 60 * 24 * 30))
    : 0;

  const guarantorTenureMonths = guarantorDetails?.join_date
    ? Math.floor((Date.now() - new Date(guarantorDetails.join_date).getTime()) / (1000 * 60 * 60 * 24 * 30))
    : 0;

  // Generate repayment schedule preview (flat interest)
  const repaymentSchedule = [];
  const startDate = new Date();
  if (isWeekly) {
    const totalInterestAmt = loan.total_repayable - loan.loan_amount;
    const weeklyInterestPortion = Math.round(totalInterestAmt / numInstallments);
    const weeklyPrincipalPortion = Math.round(loan.loan_amount / numInstallments);
    let balance = loan.loan_amount;
    for (let i = 1; i <= numInstallments; i++) {
      const dueDate = new Date(startDate);
      dueDate.setDate(dueDate.getDate() + (i * 7));
      const isLast = i === numInstallments;
      const principalPart = isLast ? balance : weeklyPrincipalPortion;
      const interestPart = isLast ? (totalInterestAmt - weeklyInterestPortion * (numInstallments - 1)) : weeklyInterestPortion;
      const amt = principalPart + interestPart;
      repaymentSchedule.push({
        installment: i,
        dueDate: dueDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        amount: Math.ceil(amt),
        interest: interestPart,
        principal: Math.max(0, principalPart),
        balance: Math.max(0, Math.round(balance - principalPart)),
        source: 'Weekly deduction',
      });
      balance = Math.max(0, balance - principalPart);
    }
  } else {
    for (let i = 1; i <= loan.duration_months; i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);
      dueDate.setDate(1);
      repaymentSchedule.push({
        installment: i,
        dueDate: dueDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        amount: installmentAmount,
        source: 'Salary deduction',
      });
    }
  }

  // Risk indicators
  const riskFlags: { label: string; severity: 'high' | 'medium' | 'low' }[] = [];
  if (Number(debtToIncomeRatio) > 50) riskFlags.push({ label: `Debt-to-income ratio: ${debtToIncomeRatio}%`, severity: 'high' });
  else if (Number(debtToIncomeRatio) > 30) riskFlags.push({ label: `Debt-to-income ratio: ${debtToIncomeRatio}%`, severity: 'medium' });
  if (existingActiveLoans.length >= 2) riskFlags.push({ label: `${existingActiveLoans.length} existing active loans`, severity: 'high' });
  if (tenureMonths < 3) riskFlags.push({ label: `Short tenure: ${tenureMonths} months`, severity: 'high' });
  else if (tenureMonths < 6) riskFlags.push({ label: `Tenure: ${tenureMonths} months`, severity: 'medium' });
  if (borrowerWalletBalance < 0) riskFlags.push({ label: `Negative wallet: UGX ${borrowerWalletBalance.toLocaleString()}`, severity: 'high' });
  if (loan.loan_amount > salary * 2) riskFlags.push({ label: 'Loan exceeds 2x salary', severity: 'medium' });

  const paidOffLoans = borrowerLoans.filter(l => l.status === 'paid_off' || l.status === 'completed');

  const handlePrint = () => {
    const riskHtml = riskFlags.length > 0 ? `
      <div class="risk-box">
        <strong>⚠ Risk Indicators:</strong>
        ${riskFlags.map(f => `<span class="risk-badge ${f.severity}">${f.label}</span>`).join(' ')}
      </div>
    ` : '<div style="color:green;font-weight:bold;margin-bottom:10px;">✅ No major risk flags detected</div>';

    const scheduleRows = repaymentSchedule.map((r: any) => `
      <tr>
        <td>${r.installment}</td>
        <td>${r.dueDate}</td>
        <td class="amount">${r.interest != null ? r.interest.toLocaleString() : '—'}</td>
        <td class="amount">${r.principal != null ? r.principal.toLocaleString() : '—'}</td>
        <td class="amount" style="font-weight:600">${r.amount.toLocaleString()}</td>
        <td class="amount">${r.balance != null ? r.balance.toLocaleString() : '—'}</td>
      </tr>
    `).join('');

    const walletRows = borrowerLedger.slice(0, 8).map((e: any) => `
      <tr>
        <td>${e.entry_type?.replace(/_/g, ' ')}</td>
        <td>${new Date(e.created_at).toLocaleDateString('en-GB')}</td>
        <td class="amount" style="color:${e.amount >= 0 ? '#28a745' : '#dc3545'}">${e.amount >= 0 ? '+' : ''}${e.amount?.toLocaleString()}</td>
      </tr>
    `).join('');

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<html><head><title>Loan Review - ${loan.employee_name}</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; color: #1a1a1a; font-size: 12px; line-height: 1.4; }
      .header { text-align: center; border-bottom: 2px solid #1a365d; padding-bottom: 12px; margin-bottom: 16px; }
      .header h1 { font-size: 18px; color: #1a365d; margin: 0 0 2px; text-transform: uppercase; }
      .header h2 { font-size: 13px; color: #555; margin: 0; font-weight: normal; }
      .header .date { font-size: 10px; color: #999; margin-top: 4px; }
      .section { margin-bottom: 14px; break-inside: avoid; }
      .section-title { font-size: 13px; font-weight: bold; padding: 5px 8px; background: #f0f4ff; border-left: 3px solid #1a365d; margin-bottom: 8px; }
      .grid { display: grid; gap: 4px 20px; font-size: 12px; }
      .grid-2 { grid-template-columns: 1fr 1fr; }
      .grid-3 { grid-template-columns: 1fr 1fr 1fr; }
      .grid-4 { grid-template-columns: 1fr 1fr 1fr 1fr; }
      .grid .label { color: #666; font-size: 10px; }
      .grid .value { font-weight: 600; margin-bottom: 4px; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; margin: 6px 0; }
      th { background: #f3f3f3; padding: 5px 6px; border: 1px solid #ddd; text-align: left; font-weight: 600; font-size: 10px; }
      td { padding: 4px 6px; border: 1px solid #ddd; }
      tr:nth-child(even) { background: #fafafa; }
      .amount { text-align: right; }
      .risk-box { background: #fff3cd; border: 1px solid #ffc107; padding: 8px; border-radius: 4px; margin-bottom: 12px; font-size: 11px; }
      .risk-badge { display: inline-block; padding: 2px 6px; border-radius: 3px; margin: 2px; font-size: 10px; }
      .risk-badge.high { background: #f8d7da; color: #721c24; }
      .risk-badge.medium { background: #fff3cd; color: #856404; }
      .risk-badge.low { background: #d4edda; color: #155724; }
      .affordability { background: #f8f9fa; padding: 8px; border-radius: 4px; margin-top: 8px; }
      .recovery-note { background: #e8f4fd; border: 1px solid #bee5eb; padding: 8px; border-radius: 4px; font-size: 11px; margin-top: 8px; }
      .penalty-note { background: #fff3cd; border: 1px solid #ffc107; padding: 8px; border-radius: 4px; font-size: 11px; margin-top: 8px; }
      .signatures { display: flex; justify-content: space-between; margin-top: 30px; font-size: 11px; }
      .signatures div { text-align: center; flex: 1; margin: 0 15px; }
      .sig-line { border-top: 1px solid #000; margin: 20px auto 6px; width: 140px; }
      .footer { text-align: center; font-size: 9px; color: #999; border-top: 1px solid #ddd; padding-top: 8px; margin-top: 20px; }
      .text-red { color: #dc3545; }
      .text-green { color: #28a745; }
      .text-orange { color: #e67e22; }
      @media print { body { padding: 0; } }
    </style></head><body>
      <div class="header">
        <h1>GREAT AGRO COFFEE</h1>
        <h2>Loan Application Review Report</h2>
        <div class="date">Generated: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} at ${new Date().toLocaleTimeString()}</div>
      </div>

      ${riskHtml}

      <div class="section">
        <div class="section-title">📋 Loan Request Details</div>
        <div class="grid grid-4">
          <div><div class="label">Loan Type</div><div class="value">${loan.loan_type === 'long_term' ? 'Long-Term' : 'Quick'} Loan</div></div>
          <div><div class="label">Principal Amount</div><div class="value">UGX ${loan.loan_amount?.toLocaleString()}</div></div>
          <div><div class="label">Interest Rate</div><div class="value">${isWeekly ? `${(loan.daily_interest_rate || 0).toFixed(3)}%/day` : `${loan.interest_rate}%/month`}</div></div>
          <div><div class="label">Duration</div><div class="value">${loan.duration_months} month(s) / ${numInstallments} ${isWeekly ? 'weeks' : 'months'}</div></div>
          <div><div class="label">Total Interest</div><div class="value">UGX ${(loan.total_repayable - loan.loan_amount)?.toLocaleString()}</div></div>
          <div><div class="label">Total Repayable</div><div class="value">UGX ${loan.total_repayable?.toLocaleString()}</div></div>
          <div><div class="label">${isWeekly ? 'Weekly' : 'Monthly'} Installment</div><div class="value">UGX ${installmentAmount?.toLocaleString()}</div></div>
          <div><div class="label">Repayment Method</div><div class="value">${isWeekly ? 'Weekly (Flat Interest)' : 'Monthly'}</div></div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">👤 Borrower Profile</div>
        <div class="grid grid-3">
          <div><div class="label">Full Name</div><div class="value">${loan.employee_name}</div></div>
          <div><div class="label">Email</div><div class="value">${loan.employee_email}</div></div>
          <div><div class="label">Phone</div><div class="value">${borrowerDetails?.phone || '—'}</div></div>
          <div><div class="label">Position</div><div class="value">${borrowerDetails?.position || '—'}</div></div>
          <div><div class="label">Department</div><div class="value">${borrowerDetails?.department || '—'}</div></div>
          <div><div class="label">Employment Tenure</div><div class="value">${tenureMonths} months</div></div>
          <div><div class="label">Monthly Salary</div><div class="value">UGX ${salary.toLocaleString()}</div></div>
          <div><div class="label">Wallet Balance</div><div class="value ${borrowerWalletBalance < 0 ? 'text-red' : ''}">UGX ${Math.abs(borrowerWalletBalance).toLocaleString()}</div></div>
          <div><div class="label">Existing Active Loans</div><div class="value">${existingActiveLoans.length}</div></div>
          <div><div class="label">Outstanding Balance</div><div class="value text-red">UGX ${totalOutstanding.toLocaleString()}</div></div>
          <div><div class="label">Past Loans Completed</div><div class="value text-green">${paidOffLoans.length}</div></div>
          <div><div class="label">Current Monthly Obligations</div><div class="value">UGX ${totalMonthlyObligations.toLocaleString()}</div></div>
        </div>
        <div class="affordability">
          <strong>📊 Affordability Analysis</strong>
          <div class="grid grid-3" style="margin-top:6px;">
            <div><div class="label">Total Monthly After Approval</div><div class="value">UGX ${totalMonthlyAfterApproval.toLocaleString()}</div></div>
            <div><div class="label">Salary Remaining</div><div class="value ${(salary - totalMonthlyAfterApproval) < 0 ? 'text-red' : 'text-green'}">UGX ${(salary - totalMonthlyAfterApproval).toLocaleString()}</div></div>
            <div><div class="label">Debt-to-Income Ratio</div><div class="value ${Number(debtToIncomeRatio) > 50 ? 'text-red' : Number(debtToIncomeRatio) > 30 ? 'text-orange' : 'text-green'}">${debtToIncomeRatio}%</div></div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">🛡️ Guarantor Information</div>
        <div class="grid grid-3">
          <div><div class="label">Name</div><div class="value">${loan.guarantor_name || '—'}</div></div>
          <div><div class="label">Position</div><div class="value">${guarantorDetails?.position || '—'}</div></div>
          <div><div class="label">Salary</div><div class="value">UGX ${(guarantorDetails?.salary || 0).toLocaleString()}</div></div>
          <div><div class="label">Guarantee Status</div><div class="value">${loan.guarantor_approved ? '✅ Approved' : loan.guarantor_declined ? '❌ Declined' : '⏳ Pending'}</div></div>
          <div><div class="label">Own Active Loans</div><div class="value">${guarantorLoans.filter((l: any) => l.employee_email === loan.guarantor_email).length}</div></div>
          <div><div class="label">Guaranteeing Others</div><div class="value">${guarantorLoans.filter((l: any) => l.guarantor_email === loan.guarantor_email && l.id !== loan.id).length}</div></div>
        </div>
        <div class="recovery-note">
          <strong>🔄 Recovery Plan:</strong> ${isWeekly ? 'Weekly' : 'Monthly'} installments of UGX ${installmentAmount.toLocaleString()} (${numInstallments} ${isWeekly ? 'weeks' : 'months'}). 
          Default recovery order: Wallet → Salary → Guarantor (${loan.guarantor_name}).
        </div>
      </div>

      <div class="section">
        <div class="section-title">📅 Repayment Schedule (Flat Interest)</div>
        <table>
          <thead><tr><th>#</th><th>Due Date</th><th class="amount">Interest</th><th class="amount">Principal</th><th class="amount">Installment</th><th class="amount">Balance</th></tr></thead>
          <tbody>${scheduleRows}</tbody>
        </table>
      </div>

      ${borrowerLedger.length > 0 ? `
      <div class="section">
        <div class="section-title">💰 Recent Wallet Activity</div>
        <table>
          <thead><tr><th>Type</th><th>Date</th><th class="amount">Amount (UGX)</th></tr></thead>
          <tbody>${walletRows}</tbody>
        </table>
      </div>` : ''}

      <div class="penalty-note">
        <strong>⚠ Late Payment Policy:</strong> 20% penalty per week overdue, max 2 weeks (40%). Missed installments block new loan requests. Recovery: Wallet → Salary → Guarantor.
      </div>

      <div class="signatures">
        <div><div class="sig-line"></div><strong>Reviewed By</strong><br/>Administrator</div>
        <div><div class="sig-line"></div><strong>Approved By</strong><br/>Finance Manager</div>
        <div><div class="sig-line"></div><strong>Borrower</strong><br/>${loan.employee_name}</div>
        <div><div class="sig-line"></div><strong>Guarantor</strong><br/>${loan.guarantor_name || '—'}</div>
      </div>

      <div class="footer">
        This is a system-generated loan review report. Interest is calculated as flat rate on the full principal. Subject to company lending policy.<br/>
        GREAT AGRO COFFEE &mdash; Loan Management System &mdash; ${new Date().getFullYear()}
      </div>
    </body></html>`);
    win.document.close();
    win.print();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Loan Application Review
            </span>
            <Button variant="outline" size="sm" onClick={handlePrint} className="no-print">
              <Printer className="h-4 w-4 mr-1" /> Print
            </Button>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[75vh] px-6 pb-6">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading review data...</div>
          ) : (
            <div className="space-y-4">
              {/* Risk Alerts */}
              {riskFlags.length > 0 && (
                <Card className="border-destructive/30 bg-destructive/5">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <span className="font-semibold text-sm text-destructive">Risk Indicators</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {riskFlags.map((flag, i) => (
                        <Badge key={i} variant={flag.severity === 'high' ? 'destructive' : 'outline'} className="text-xs">
                          {flag.label}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Loan Summary */}
              <Card>
                <CardHeader className="pb-2 p-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Banknote className="h-4 w-4" /> Loan Request Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Loan Type</p>
                      <p className="font-bold">{loan.loan_type === 'long_term' ? 'Long-Term' : 'Quick'} Loan</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Principal Amount</p>
                      <p className="font-bold">UGX {loan.loan_amount?.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Interest Rate</p>
                      <p className="font-bold">{isWeekly ? `${(loan.daily_interest_rate || 0).toFixed(2)}%/day` : `${loan.interest_rate}%/month`}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Total Interest</p>
                      <p className="font-bold">UGX {(loan.total_repayable - loan.loan_amount)?.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Total Repayable</p>
                      <p className="font-bold">UGX {loan.total_repayable?.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">{isWeekly ? 'Weekly' : isBullet ? 'Bullet' : 'Monthly'} Installment</p>
                      <p className="font-bold">UGX {installmentAmount?.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Duration</p>
                      <p className="font-bold">{loan.duration_months} month(s) / {numInstallments} {isWeekly ? 'weeks' : isBullet ? 'payment' : 'months'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Repayment Frequency</p>
                      <p className="font-bold capitalize">{loan.repayment_frequency || 'weekly'}</p>
                    </div>
                  </div>
                  {loan.purpose && (
                    <div className="mt-3 p-2 bg-muted/50 rounded text-sm">
                      <p className="text-muted-foreground text-xs mb-1">Purpose</p>
                      <p className="font-medium">{loan.purpose}</p>
                    </div>
                  )}
                  <div className="mt-3 p-2 bg-muted/50 rounded text-sm">
                    <p className="text-muted-foreground text-xs mb-1">Application Date</p>
                    <p className="font-medium">{new Date(loan.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Borrower Profile */}
              <Card>
                <CardHeader className="pb-2 p-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <User className="h-4 w-4" /> Borrower Profile
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Full Name</p>
                      <p className="font-medium">{loan.employee_name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Employee ID</p>
                      <p className="font-medium">{borrowerDetails?.employee_id || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Email</p>
                      <p className="font-medium text-xs">{loan.employee_email}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Phone</p>
                      <p className="font-medium">{borrowerDetails?.phone || loan.employee_phone || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Position</p>
                      <p className="font-medium">{borrowerDetails?.position || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Department</p>
                      <p className="font-medium">{borrowerDetails?.department || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Role</p>
                      <p className="font-medium">{borrowerDetails?.role || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Status</p>
                      <Badge variant={borrowerDetails?.status === 'Active' ? 'default' : 'destructive'} className="text-xs">{borrowerDetails?.status || '-'}</Badge>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Join Date</p>
                      <p className="font-medium">{borrowerDetails?.join_date ? new Date(borrowerDetails.join_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Employment Tenure</p>
                      <p className="font-medium">{tenureMonths} months</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Monthly Salary</p>
                      <p className="font-bold">UGX {salary.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Wallet Balance</p>
                      <p className={`font-bold ${borrowerWalletBalance < 0 ? 'text-destructive' : ''}`}>
                        {borrowerWalletBalance < 0 ? '-' : ''}UGX {Math.abs(borrowerWalletBalance).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Address</p>
                      <p className="font-medium">{borrowerDetails?.address || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Emergency Contact</p>
                      <p className="font-medium">{borrowerDetails?.emergency_contact || '-'}</p>
                    </div>
                  </div>

                  <Separator className="my-3" />

                  {/* Loan Limit Info */}
                  <div className="bg-muted/50 rounded-lg p-3 mb-3">
                    <p className="text-xs font-semibold mb-2">📊 Loan Eligibility</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Max Loan Limit (2x Salary)</p>
                        <p className="font-bold">UGX {loanLimit.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Total Outstanding</p>
                        <p className="font-bold text-destructive">UGX {totalOutstanding.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Available Limit</p>
                        <p className={`font-bold ${availableLoanLimit < loan.loan_amount ? 'text-destructive' : ''}`}>UGX {availableLoanLimit.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">This Loan vs Limit</p>
                        <p className={`font-bold ${loan.loan_amount > availableLoanLimit ? 'text-destructive' : ''}`}>
                          {loan.loan_amount > availableLoanLimit ? '⚠ EXCEEDS LIMIT' : '✅ Within Limit'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Existing Active Loans</p>
                      <p className="font-bold">{existingActiveLoans.length}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Outstanding Balance</p>
                      <p className="font-bold text-destructive">UGX {totalOutstanding.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Current Monthly Obligations</p>
                      <p className="font-bold">UGX {totalMonthlyObligations.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Past Loans Completed</p>
                      <p className="font-bold text-green-600">{paidOffLoans.length}</p>
                    </div>
                  </div>

                  <Separator className="my-3" />

                  {/* Affordability Analysis */}
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs font-semibold mb-2 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" /> Affordability Analysis
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Total Monthly After Approval</p>
                        <p className="font-bold">UGX {totalMonthlyAfterApproval.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Salary Remaining</p>
                        <p className={`font-bold ${(salary - totalMonthlyAfterApproval) < 0 ? 'text-destructive' : 'text-green-600'}`}>
                          UGX {(salary - totalMonthlyAfterApproval).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Debt-to-Income Ratio</p>
                        <p className={`font-bold ${Number(debtToIncomeRatio) > 50 ? 'text-destructive' : Number(debtToIncomeRatio) > 30 ? 'text-orange-600' : 'text-green-600'}`}>
                          {debtToIncomeRatio}%
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Guarantor Full Profile */}
              <Card>
                <CardHeader className="pb-2 p-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Shield className="h-4 w-4" /> Guarantor Profile
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Full Name</p>
                      <p className="font-medium">{loan.guarantor_name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Employee ID</p>
                      <p className="font-medium">{guarantorDetails?.employee_id || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Email</p>
                      <p className="font-medium text-xs">{loan.guarantor_email || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Phone</p>
                      <p className="font-medium">{guarantorDetails?.phone || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Position</p>
                      <p className="font-medium">{guarantorDetails?.position || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Department</p>
                      <p className="font-medium">{guarantorDetails?.department || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Role</p>
                      <p className="font-medium">{guarantorDetails?.role || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Status</p>
                      <Badge variant={guarantorDetails?.status === 'Active' ? 'default' : 'destructive'} className="text-xs">{guarantorDetails?.status || '-'}</Badge>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Tenure</p>
                      <p className="font-medium">{guarantorTenureMonths} months</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Monthly Salary</p>
                      <p className="font-bold">UGX {(guarantorDetails?.salary || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Wallet Balance</p>
                      <p className={`font-bold ${guarantorWalletBalance < 0 ? 'text-destructive' : ''}`}>
                        {guarantorWalletBalance < 0 ? '-' : ''}UGX {Math.abs(guarantorWalletBalance).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Guarantee Status</p>
                      {loan.guarantor_approved ? (
                        <Badge className="text-xs bg-green-600">Approved</Badge>
                      ) : loan.guarantor_declined ? (
                        <Badge variant="destructive" className="text-xs">Declined</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">Pending</Badge>
                      )}
                    </div>
                  </div>

                  <Separator className="my-3" />

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Own Active Loans</p>
                      <p className="font-bold">{guarantorLoans.filter(l => l.employee_email === loan.guarantor_email).length}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Guaranteeing Others</p>
                      <p className="font-bold">{guarantorLoans.filter(l => l.guarantor_email === loan.guarantor_email && l.id !== loan.id).length}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Guarantor Salary Coverage</p>
                      <p className={`font-bold ${(guarantorDetails?.salary || 0) < loan.loan_amount ? 'text-destructive' : ''}`}>
                        {(guarantorDetails?.salary || 0) >= loan.loan_amount ? '✅ Covers loan' : '⚠ Below loan amount'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
                    <strong>Recovery Plan:</strong> {isWeekly ? 'Weekly' : isBullet ? 'Bullet' : 'Monthly'} installments of UGX {installmentAmount.toLocaleString()} ({numInstallments} {isWeekly ? 'weeks' : isBullet ? 'payment' : 'months'}). 
                    Default recovery order: Wallet → Salary → Guarantor ({loan.guarantor_name}).
                  </div>
                </CardContent>
              </Card>

              {/* Repayment Schedule */}
              <Card>
                <CardHeader className="pb-2 p-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> Repayment Schedule
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-2 text-xs font-medium">#</th>
                          <th className="text-left p-2 text-xs font-medium">Due Date</th>
                          <th className="text-right p-2 text-xs font-medium">Interest</th>
                          <th className="text-right p-2 text-xs font-medium">Principal</th>
                          <th className="text-right p-2 text-xs font-medium">Installment</th>
                          <th className="text-right p-2 text-xs font-medium">Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {repaymentSchedule.map((r: any) => (
                          <tr key={r.installment} className="border-t">
                            <td className="p-2 text-xs">{r.installment}</td>
                            <td className="p-2 text-xs font-medium">{r.dueDate}</td>
                            <td className="p-2 text-xs text-right text-muted-foreground">{r.interest != null ? `UGX ${r.interest.toLocaleString()}` : '—'}</td>
                            <td className="p-2 text-xs text-right">{r.principal != null ? `UGX ${r.principal.toLocaleString()}` : '—'}</td>
                            <td className="p-2 text-xs text-right font-medium">UGX {r.amount.toLocaleString()}</td>
                            <td className="p-2 text-xs text-right">{r.balance != null ? `UGX ${r.balance.toLocaleString()}` : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Wallet Activity */}
              {borrowerLedger.length > 0 && (
                <Card>
                  <CardHeader className="pb-2 p-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Wallet className="h-4 w-4" /> Recent Wallet Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="space-y-1">
                      {borrowerLedger.slice(0, 8).map((entry: any) => (
                        <div key={entry.id} className="flex justify-between items-center text-xs py-1 border-b last:border-0">
                          <div>
                            <span className="font-medium">{entry.entry_type?.replace(/_/g, ' ')}</span>
                            <span className="text-muted-foreground ml-2">
                              {new Date(entry.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <span className={entry.amount >= 0 ? 'text-green-600 font-medium' : 'text-destructive font-medium'}>
                            {entry.amount >= 0 ? '+' : ''}UGX {entry.amount?.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Separator />

              {/* Decision Section */}
              {loan.status === 'pending_admin' && (
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Rejection Reason (if declining)</Label>
                  <Textarea
                    placeholder="Provide reason for rejection..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="text-sm"
                  />
                  <div className="flex gap-3">
                    <Button
                      className="flex-1"
                      onClick={() => onApprove(loan.id)}
                      disabled={submitting}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Approve & Disburse
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => onReject(loan.id, rejectionReason || 'Admin declined')}
                      disabled={submitting}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default LoanReviewModal;
