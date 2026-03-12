import React, { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Printer, Download } from 'lucide-react';

interface LoanRepaymentSlipProps {
  open: boolean;
  onClose: () => void;
  loanData: {
    employeeName: string;
    employeeEmail: string;
    guarantorName: string;
    loanAmount: number;
    interestRate: number;
    dailyRate: number;
    durationMonths: number;
    totalWeeks: number;
    weeklyInstallment: number;
    totalRepayable: number;
    totalInterest: number;
    loanType?: 'quick' | 'long_term';
    repaymentFrequency?: 'weekly' | 'monthly' | 'bullet';
  } | null;
}

const LoanRepaymentSlip = ({ open, onClose, loanData }: LoanRepaymentSlipProps) => {
  const slipRef = useRef<HTMLDivElement>(null);

  if (!loanData) return null;

  const { employeeName, employeeEmail, guarantorName, loanAmount, interestRate, dailyRate, durationMonths, totalWeeks, weeklyInstallment, totalRepayable, totalInterest, loanType, repaymentFrequency } = loanData;
  const isLongTerm = loanType === 'long_term';
  const freq = repaymentFrequency || 'weekly';
  const isBullet = freq === 'bullet';
  const isMonthly = freq === 'monthly';

  // Generate schedule based on frequency
  const schedule: { period: number; label: string; dueDate: string; installment: number; interest: number; principal: number; balance: number }[] = [];
  const scheduleInterest = totalRepayable - loanAmount;
  const numPeriods = isBullet ? 1 : (isMonthly ? durationMonths : totalWeeks);
  const periodInterest = Math.round(scheduleInterest / numPeriods);
  const periodPrincipal = Math.round(loanAmount / numPeriods);
  let balance = loanAmount;
  const startDate = new Date();

  for (let i = 1; i <= numPeriods; i++) {
    const dueDate = new Date(startDate);
    if (isBullet) {
      dueDate.setMonth(dueDate.getMonth() + durationMonths);
    } else if (isMonthly) {
      dueDate.setMonth(dueDate.getMonth() + i);
    } else {
      dueDate.setDate(dueDate.getDate() + i * 7);
    }
    const isLast = i === numPeriods;
    const principalPart = isLast ? balance : periodPrincipal;
    const interestPart = isLast ? (scheduleInterest - periodInterest * (numPeriods - 1)) : periodInterest;
    const installmentAmt = principalPart + interestPart;
    const newBalance = Math.max(0, Math.round(balance - principalPart));
    schedule.push({
      period: i,
      label: isBullet ? 'End of Term' : (isMonthly ? `Month ${i}` : `Wk ${i}`),
      dueDate: dueDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      installment: Math.ceil(installmentAmt),
      interest: interestPart,
      principal: Math.max(0, principalPart),
      balance: newBalance,
    });
    balance = newBalance;
  }

  const handlePrint = () => {
    const content = slipRef.current;
    if (!content) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head><title>Loan Repayment Statement - ${employeeName}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; color: #1a1a1a; }
        h1 { font-size: 18px; margin-bottom: 4px; }
        h2 { font-size: 14px; color: #555; margin-top: 0; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 12px; margin-bottom: 16px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; font-size: 13px; margin-bottom: 16px; }
        .info-grid .label { color: #666; }
        .info-grid .value { font-weight: 600; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }
        th { background: #f3f3f3; padding: 6px 8px; border: 1px solid #ddd; text-align: left; font-weight: 600; }
        td { padding: 5px 8px; border: 1px solid #ddd; }
        tr:nth-child(even) { background: #fafafa; }
        .summary { margin-top: 16px; font-size: 13px; border-top: 1px solid #ccc; padding-top: 12px; }
        .summary div { display: flex; justify-content: space-between; margin-bottom: 4px; }
        .summary .total { font-weight: 700; font-size: 14px; border-top: 1px solid #333; padding-top: 6px; margin-top: 6px; }
        .footer { margin-top: 24px; font-size: 11px; color: #888; text-align: center; border-top: 1px solid #eee; padding-top: 8px; }
        .penalty-note { margin-top: 12px; padding: 8px; background: #fff3cd; border: 1px solid #ffc107; font-size: 11px; border-radius: 4px; }
        @media print { body { padding: 0; } }
      </style></head><body>
      ${content.innerHTML}
      </body></html>
    `);
    win.document.close();
    win.print();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Loan Repayment Statement</span>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-1" /> Print
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div ref={slipRef}>
          <div className="header" style={{ textAlign: 'center', borderBottom: '2px solid', paddingBottom: 12, marginBottom: 16 }}>
            <h1 style={{ fontSize: 18, marginBottom: 2 }}>GREAT AGRO COFFEE</h1>
            <h2 style={{ fontSize: 13, color: '#666', margin: 0 }}>Loan Repayment Statement</h2>
            <p style={{ fontSize: 11, color: '#999', margin: '4px 0 0' }}>Generated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm mb-4">
            <span className="text-muted-foreground">Borrower:</span><span className="font-semibold">{employeeName}</span>
            <span className="text-muted-foreground">Email:</span><span>{employeeEmail}</span>
            <span className="text-muted-foreground">Guarantor:</span><span className="font-semibold">{guarantorName}</span>
            <span className="text-muted-foreground">Loan Amount:</span><span className="font-semibold">UGX {loanAmount.toLocaleString()}</span>
            <span className="text-muted-foreground">Interest Rate:</span><span>{interestRate}%/month{isLongTerm ? ' (max 25%)' : ''}</span>
            <span className="text-muted-foreground">Duration:</span><span>{durationMonths} month(s)</span>
            <span className="text-muted-foreground">Loan Type:</span><span className="font-semibold">{isLongTerm ? 'Long-Term Loan' : 'Quick Loan'}</span>
            <span className="text-muted-foreground">Repayment:</span><span>{isBullet ? 'Bullet (Lump Sum at End)' : isMonthly ? 'Monthly Installments' : 'Weekly Installments'} (Flat Interest)</span>
            {isLongTerm && (
              <>
                <span className="text-muted-foreground">Early Repayment:</span><span className="text-green-600 font-medium">Pay only for days used</span>
              </>
            )}
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">#</TableHead>
                <TableHead className="text-xs">Due Date</TableHead>
                <TableHead className="text-xs text-right">Interest</TableHead>
                <TableHead className="text-xs text-right">Principal</TableHead>
                <TableHead className="text-xs text-right">Installment</TableHead>
                <TableHead className="text-xs text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedule.map(row => (
                <TableRow key={row.period}>
                  <TableCell className="text-xs py-1">{row.label}</TableCell>
                  <TableCell className="text-xs py-1">{row.dueDate}</TableCell>
                  <TableCell className="text-xs py-1 text-right">{row.interest.toLocaleString()}</TableCell>
                  <TableCell className="text-xs py-1 text-right">{row.principal.toLocaleString()}</TableCell>
                  <TableCell className="text-xs py-1 text-right font-medium">{row.installment.toLocaleString()}</TableCell>
                  <TableCell className="text-xs py-1 text-right">{row.balance.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-4 border-t pt-3 space-y-1 text-sm">
            <div className="flex justify-between"><span>Total Principal:</span><span>UGX {loanAmount.toLocaleString()}</span></div>
            <div className="flex justify-between"><span>Total Interest:</span><span>UGX {Math.ceil(totalInterest).toLocaleString()}</span></div>
            <div className="flex justify-between font-bold border-t pt-2 mt-2"><span>Total Repayable:</span><span>UGX {Math.ceil(totalRepayable).toLocaleString()}</span></div>
            <div className="flex justify-between font-semibold text-primary">
              <span>{isBullet ? 'Lump Sum Payment:' : isMonthly ? 'Monthly Installment:' : 'Weekly Installment:'}</span>
              <span>UGX {Math.ceil(weeklyInstallment).toLocaleString()}</span>
            </div>
          </div>

          <div className="mt-3 p-2 bg-yellow-50 border border-yellow-300 rounded text-xs text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-700 dark:text-yellow-300">
            <strong>⚠ Late Payment Penalty:</strong> 20% of installment per week overdue, max 2 weeks (40%). Recovery order: Wallet → Salary → Guarantor. Missed installments block new loan requests.
          </div>
          {isLongTerm && (
            <div className="mt-2 p-2 bg-blue-50 border border-blue-300 rounded text-xs text-blue-800 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-300">
              <strong>💡 Early Repayment Benefit:</strong> Long-term loans charge interest daily ({dailyRate.toFixed(3)}%/day = {interestRate}%/month). If you repay early, you only pay interest for the actual number of days you held the loan. Use the "Repay via MoMo" button to pay early and save on interest.
            </div>
          )}

          <p className="text-center text-[10px] text-muted-foreground mt-4 border-t pt-2">
            This is a system-generated statement. Interest is calculated as flat rate on the full principal. Terms subject to company policy.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LoanRepaymentSlip;
