import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, RefreshCw, ShieldCheck, Clock, FileText } from 'lucide-react';
import { loanApprovalBlock } from '@/lib/loanApprovalRules';

interface Props {
  loans: any[];
  loading: boolean;
  error: string | null;
  actorEmail?: string;
  onRefresh: () => void;
  onReview: (loan: any) => void;
  onDetails: (loan: any) => void;
  onTrack: (loan: any) => void;
}

export default function AdminLoanQueue({ loans, loading, error, actorEmail, onRefresh, onReview, onDetails, onTrack }: Props) {
  return <section className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Loan requests</h3>
        <Badge variant="secondary">{loans.length}</Badge>
      </div>
      <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</Button>
    </div>
    {error ? <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>
      : loading ? <p role="status" className="py-6 text-sm text-muted-foreground">Loading loan requests…</p>
      : loans.length === 0 ? <p className="py-6 text-sm text-muted-foreground">No pending loan requests.</p>
      : <div className="grid gap-3 lg:grid-cols-2">{loans.map(loan => {
        const block = loanApprovalBlock(loan, actorEmail, true);
        const reviewable = ['pending_admin', 'revision_pending_signature'].includes(loan.status);
        return <article key={loan.id} className="min-w-0 rounded-lg border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0"><h4 className="font-semibold break-words">{loan.employee_name}</h4><p className="text-xs text-muted-foreground">{String(loan.loan_type || 'quick').replace(/_/g, ' ')} loan · {new Date(loan.created_at).toLocaleDateString('en-GB')}</p></div>
            <Badge variant="outline">{String(loan.status).replace(/_/g, ' ')}</Badge>
          </div>
          <dl className="my-4 grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-xs text-muted-foreground">Principal</dt><dd className="font-semibold tabular-nums">UGX {Number(loan.loan_amount).toLocaleString()}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Total repayable</dt><dd className="font-semibold tabular-nums">UGX {Number(loan.total_repayable).toLocaleString()}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Duration</dt><dd>{loan.duration_months} months</dd></div>
            <div><dt className="text-xs text-muted-foreground">Repayment</dt><dd className="capitalize">{loan.repayment_frequency}</dd></div>
          </dl>
          <div className="space-y-1 border-t pt-3 text-xs text-muted-foreground">
            {[1, 2].map(slot => {
              const prefix = slot === 1 ? 'guarantor' : 'guarantor2';
              return loan[`${prefix}_email`] ? <p key={slot} className="break-words">{loan[`${prefix}_name`] || loan[`${prefix}_email`]} — {loan[`${prefix}_declined`] ? 'Declined' : loan[`${prefix}_approved`] ? 'Approved' : 'Pending'}</p> : null;
            })}
            {block && <p className="flex items-start gap-1.5 pt-1"><Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />{block}</p>}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {reviewable && <Button size="sm" onClick={() => onReview(loan)}><ShieldCheck className="mr-1.5 h-4 w-4" />Review loan</Button>}
            <Button size="sm" variant="outline" onClick={() => onDetails(loan)}><FileText className="mr-1.5 h-4 w-4" />Details</Button>
            <Button size="sm" variant="ghost" onClick={() => onTrack(loan)}><Eye className="mr-1.5 h-4 w-4" />Progress</Button>
          </div>
        </article>;
      })}</div>}
  </section>;
}