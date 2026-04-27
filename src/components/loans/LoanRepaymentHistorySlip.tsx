import React, { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Printer } from 'lucide-react';

interface RepaymentRow {
  id: string;
  installment_number: number;
  due_date: string;
  paid_date: string | null;
  amount_due: number;
  amount_paid: number;
  status: string;
  deducted_from: string | null;
  payment_reference: string | null;
  penalty_applied: number | null;
  overdue_days: number | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  loanInfo: {
    employeeName: string;
    employeeEmail: string;
    loanAmount: number;
    totalRepayable: number;
    remainingBalance: number;
    loanType?: string;
    repaymentFrequency?: string;
    startDate?: string;
  } | null;
  repayments: RepaymentRow[];
}

const fmtDate = (d?: string | null) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtMoney = (n: number) => `UGX ${Math.round(n || 0).toLocaleString()}`;

const LoanRepaymentHistorySlip = ({ open, onClose, loanInfo, repayments }: Props) => {
  const slipRef = useRef<HTMLDivElement>(null);
  if (!loanInfo) return null;

  const sorted = [...repayments].sort((a, b) => {
    const ad = a.paid_date || a.due_date;
    const bd = b.paid_date || b.due_date;
    return ad.localeCompare(bd);
  });

  const totalPaid = sorted.reduce((s, r) => s + Number(r.amount_paid || 0), 0);
  const totalPenalty = sorted.reduce((s, r) => s + Number(r.penalty_applied || 0), 0);
  const paidCount = sorted.filter(r => r.status === 'paid').length;
  const partialCount = sorted.filter(r => Number(r.amount_paid || 0) > 0 && r.status !== 'paid').length;
  const pendingCount = sorted.filter(r => Number(r.amount_paid || 0) === 0).length;

  // Group by source
  const bySource: Record<string, number> = {};
  sorted.forEach(r => {
    if (Number(r.amount_paid || 0) > 0) {
      const src = r.deducted_from || 'Unknown';
      bySource[src] = (bySource[src] || 0) + Number(r.amount_paid);
    }
  });

  const handlePrint = () => {
    const content = slipRef.current;
    if (!content) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head><title>Repayment History — ${loanInfo.employeeName}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; color: #1a1a1a; }
        h1 { font-size: 18px; margin-bottom: 4px; }
        h2 { font-size: 13px; color: #555; margin-top: 0; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 12px; margin-bottom: 16px; }
        .info { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; font-size: 12px; margin-bottom: 14px; }
        .info .label { color: #666; }
        .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 12px 0; }
        .stat { border: 1px solid #ddd; padding: 8px; border-radius: 4px; text-align: center; }
        .stat .v { font-size: 14px; font-weight: 700; }
        .stat .l { font-size: 10px; color: #666; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 8px; }
        th { background: #f3f3f3; padding: 5px 6px; border: 1px solid #ddd; text-align: left; font-weight: 600; }
        td { padding: 4px 6px; border: 1px solid #ddd; }
        tr:nth-child(even) { background: #fafafa; }
        .paid { color: #15803d; font-weight: 600; }
        .overdue { color: #b91c1c; font-weight: 600; }
        .summary { margin-top: 14px; border-top: 1px solid #ccc; padding-top: 10px; font-size: 12px; }
        .summary div { display: flex; justify-content: space-between; margin-bottom: 3px; }
        .summary .total { font-weight: 700; font-size: 13px; border-top: 1px solid #333; padding-top: 5px; margin-top: 5px; }
        .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 32px; font-size: 11px; }
        .sig { border-top: 1px solid #333; padding-top: 4px; text-align: center; }
        .footer { margin-top: 20px; font-size: 10px; color: #888; text-align: center; border-top: 1px solid #eee; padding-top: 6px; }
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Repayment History Statement</span>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-1" /> Print
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div ref={slipRef}>
          <div className="header" style={{ textAlign: 'center', borderBottom: '2px solid', paddingBottom: 12, marginBottom: 16 }}>
            <h1 style={{ fontSize: 18, marginBottom: 2 }}>GREAT AGRO COFFEE LTD</h1>
            <h2 style={{ fontSize: 13, color: '#666', margin: 0 }}>Loan Repayment History Statement</h2>
            <p style={{ fontSize: 11, color: '#999', margin: '4px 0 0' }}>
              Generated: {new Date().toLocaleString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          <div className="info grid grid-cols-2 gap-x-6 gap-y-1 text-sm mb-4">
            <span className="label text-muted-foreground">Borrower:</span><span className="font-semibold">{loanInfo.employeeName}</span>
            <span className="label text-muted-foreground">Email:</span><span>{loanInfo.employeeEmail}</span>
            <span className="label text-muted-foreground">Loan Type:</span><span className="font-semibold">{loanInfo.loanType === 'long_term' ? 'Long-Term' : 'Quick'}</span>
            <span className="label text-muted-foreground">Frequency:</span><span className="capitalize">{loanInfo.repaymentFrequency || 'weekly'}</span>
            <span className="label text-muted-foreground">Principal:</span><span className="font-semibold">{fmtMoney(loanInfo.loanAmount)}</span>
            <span className="label text-muted-foreground">Total Repayable:</span><span className="font-semibold">{fmtMoney(loanInfo.totalRepayable)}</span>
            <span className="label text-muted-foreground">Start Date:</span><span>{fmtDate(loanInfo.startDate)}</span>
            <span className="label text-muted-foreground">Outstanding Balance:</span><span className="font-bold text-destructive">{fmtMoney(loanInfo.remainingBalance)}</span>
          </div>

          <div className="stats grid grid-cols-2 md:grid-cols-4 gap-2 my-3">
            <div className="stat border rounded p-2 text-center">
              <div className="v text-base font-bold text-green-600">{paidCount}</div>
              <div className="l text-[10px] text-muted-foreground">Fully Paid</div>
            </div>
            <div className="stat border rounded p-2 text-center">
              <div className="v text-base font-bold text-amber-600">{partialCount}</div>
              <div className="l text-[10px] text-muted-foreground">Partial</div>
            </div>
            <div className="stat border rounded p-2 text-center">
              <div className="v text-base font-bold text-muted-foreground">{pendingCount}</div>
              <div className="l text-[10px] text-muted-foreground">Pending</div>
            </div>
            <div className="stat border rounded p-2 text-center">
              <div className="v text-base font-bold">{fmtMoney(totalPaid)}</div>
              <div className="l text-[10px] text-muted-foreground">Total Paid</div>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">#</TableHead>
                <TableHead className="text-xs">Due Date</TableHead>
                <TableHead className="text-xs">Paid Date</TableHead>
                <TableHead className="text-xs text-right">Due</TableHead>
                <TableHead className="text-xs text-right">Paid</TableHead>
                <TableHead className="text-xs text-right">Penalty</TableHead>
                <TableHead className="text-xs">Source</TableHead>
                <TableHead className="text-xs">Reference</TableHead>
                <TableHead className="text-xs">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-4">No repayment activity yet</TableCell></TableRow>
              ) : sorted.map(r => {
                const isPaid = r.status === 'paid';
                const isOverdue = r.status === 'overdue' || (r.amount_paid < r.amount_due && r.due_date < new Date().toISOString().split('T')[0] && !isPaid);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs py-1">{r.installment_number}</TableCell>
                    <TableCell className="text-xs py-1">{fmtDate(r.due_date)}</TableCell>
                    <TableCell className="text-xs py-1">{fmtDate(r.paid_date)}</TableCell>
                    <TableCell className="text-xs py-1 text-right">{Number(r.amount_due || 0).toLocaleString()}</TableCell>
                    <TableCell className={`text-xs py-1 text-right ${isPaid ? 'paid text-green-600 font-semibold' : ''}`}>
                      {Number(r.amount_paid || 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs py-1 text-right">
                      {r.penalty_applied ? <span className="text-destructive">{Number(r.penalty_applied).toLocaleString()}</span> : '—'}
                    </TableCell>
                    <TableCell className="text-xs py-1">{r.deducted_from || '—'}</TableCell>
                    <TableCell className="text-xs py-1 font-mono text-[10px]">{r.payment_reference || '—'}</TableCell>
                    <TableCell className="text-xs py-1">
                      {isPaid ? <Badge className="bg-green-100 text-green-800 text-[10px]">Paid</Badge>
                        : isOverdue ? <Badge variant="destructive" className="text-[10px]">Overdue {r.overdue_days ? `(${r.overdue_days}d)` : ''}</Badge>
                        : Number(r.amount_paid) > 0 ? <Badge className="bg-amber-100 text-amber-800 text-[10px]">Partial</Badge>
                        : <Badge variant="secondary" className="text-[10px]">Pending</Badge>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {Object.keys(bySource).length > 0 && (
            <div className="mt-4 border rounded p-3">
              <p className="text-xs font-semibold mb-2">Recovery Source Breakdown</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                {Object.entries(bySource).map(([src, amt]) => (
                  <div key={src} className="flex justify-between border-b py-1">
                    <span className="capitalize text-muted-foreground">{src.replace(/_/g, ' ')}:</span>
                    <span className="font-semibold">{fmtMoney(amt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="summary mt-4 border-t pt-3 space-y-1 text-sm">
            <div className="flex justify-between"><span>Total Repayable:</span><span>{fmtMoney(loanInfo.totalRepayable)}</span></div>
            <div className="flex justify-between"><span>Total Paid to Date:</span><span className="text-green-600 font-semibold">{fmtMoney(totalPaid)}</span></div>
            <div className="flex justify-between"><span>Total Penalties Applied:</span><span className="text-destructive">{fmtMoney(totalPenalty)}</span></div>
            <div className="flex justify-between total font-bold border-t pt-2 mt-2"><span>Outstanding Balance:</span><span className="text-destructive">{fmtMoney(loanInfo.remainingBalance)}</span></div>
          </div>

          <div className="signatures grid grid-cols-2 gap-6 mt-8 text-xs">
            <div className="sig border-t pt-1 text-center">Finance Officer</div>
            <div className="sig border-t pt-1 text-center">Borrower / Acknowledged By</div>
          </div>

          <p className="footer text-center text-[10px] text-muted-foreground mt-4 border-t pt-2">
            System-generated repayment history. All transactions are recorded against the borrower's account ledger.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LoanRepaymentHistorySlip;