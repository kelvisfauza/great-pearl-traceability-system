import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, XCircle, Banknote, FileText, Shield, UserCheck } from 'lucide-react';

type StepState = 'done' | 'pending' | 'rejected' | 'skipped';

interface Step {
  label: string;
  who?: string;
  state: StepState;
  at?: string | null;
  note?: string;
  icon: React.ReactNode;
}

const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

const stateBadge = (state: StepState) => {
  if (state === 'done') return <Badge className="bg-emerald-600 hover:bg-emerald-600">Approved</Badge>;
  if (state === 'rejected') return <Badge variant="destructive">Declined</Badge>;
  if (state === 'skipped') return <Badge variant="outline">Not required</Badge>;
  return <Badge variant="secondary">Pending</Badge>;
};

const stateIcon = (state: StepState, icon: React.ReactNode) => {
  if (state === 'done') return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  if (state === 'rejected') return <XCircle className="h-4 w-4 text-destructive" />;
  if (state === 'pending') return <Clock className="h-4 w-4 text-amber-500" />;
  return icon;
};

export const buildLoanApprovalSteps = (loan: any): Step[] => {
  const steps: Step[] = [];
  const terminal = ['cancelled', 'rejected'].includes(loan.status);

  steps.push({
    label: 'Application submitted',
    who: loan.employee_name || loan.employee_email,
    state: 'done',
    at: loan.created_at,
    icon: <FileText className="h-4 w-4 text-muted-foreground" />,
  });

  if (loan.guarantor_email) {
    steps.push({
      label: 'Guarantor 1',
      who: `${loan.guarantor_name || loan.guarantor_email}`,
      state: loan.guarantor_declined ? 'rejected' : loan.guarantor_approved ? 'done' : 'pending',
      at: loan.guarantor_approved_at,
      icon: <Shield className="h-4 w-4 text-muted-foreground" />,
    });
  }

  if (loan.guarantor2_email) {
    steps.push({
      label: 'Guarantor 2',
      who: `${loan.guarantor2_name || loan.guarantor2_email}`,
      state: loan.guarantor2_declined ? 'rejected' : loan.guarantor2_approved ? 'done' : 'pending',
      at: loan.guarantor2_approved_at,
      icon: <Shield className="h-4 w-4 text-muted-foreground" />,
    });
  }

  steps.push({
    label: 'Administrator approval',
    who: loan.admin_approved_by || 'Awaiting an administrator',
    state: loan.admin_rejection_reason
      ? 'rejected'
      : loan.admin_approved
        ? 'done'
        : terminal
          ? 'rejected'
          : 'pending',
    at: loan.admin_approved_at,
    note: loan.admin_rejection_reason || (loan.approved_via_appeal ? 'Approved through the appeals committee' : undefined),
    icon: <UserCheck className="h-4 w-4 text-muted-foreground" />,
  });

  steps.push({
    label: 'Disbursement to wallet',
    who: loan.disbursed_amount ? `UGX ${Number(loan.disbursed_amount).toLocaleString()} released` : 'Released after approval',
    state: ['disbursed', 'active', 'completed', 'defaulted'].includes(loan.status)
      ? 'done'
      : terminal
        ? 'rejected'
        : 'pending',
    icon: <Banknote className="h-4 w-4 text-muted-foreground" />,
  });

  return steps;
};

export const LoanApprovalTrackerInline = ({ loan }: { loan: any }) => {
  const steps = buildLoanApprovalSteps(loan);
  const nextPending = steps.find((s) => s.state === 'pending');
  return (
    <div className="space-y-3">
      <div className="rounded border bg-muted/40 p-2 text-xs">
        {nextPending ? (
          <>Currently waiting on: <strong>{nextPending.label}</strong>{nextPending.who ? ` — ${nextPending.who}` : ''}</>
        ) : (
          <>No pending approvals for this application.</>
        )}
      </div>
      <ol className="space-y-2">
        {steps.map((s, i) => (
          <li key={i} className="flex items-start gap-3 rounded border p-2">
            <div className="mt-0.5">{stateIcon(s.state, s.icon)}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{s.label}</span>
                {stateBadge(s.state)}
              </div>
              {s.who && <div className="text-xs text-muted-foreground truncate">{s.who}</div>}
              {s.at && <div className="text-[11px] text-muted-foreground">{fmt(s.at)}</div>}
              {s.note && <div className="text-[11px] text-muted-foreground italic">{s.note}</div>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
};

const LoanApprovalTracker = ({ loan, open, onOpenChange }: { loan: any | null; open: boolean; onOpenChange: (v: boolean) => void }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Application progress</DialogTitle>
      </DialogHeader>
      {loan && (
        <div className="space-y-3">
          <div className="text-sm">
            UGX {Number(loan.loan_amount || 0).toLocaleString()} · {loan.duration_months} months · status{' '}
            <span className="font-medium">{String(loan.status || '').replace(/_/g, ' ')}</span>
          </div>
          <LoanApprovalTrackerInline loan={loan} />
        </div>
      )}
    </DialogContent>
  </Dialog>
);

export default LoanApprovalTracker;
