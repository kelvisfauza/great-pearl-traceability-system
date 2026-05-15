import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { fmtUGX } from '@/lib/payroll/statutory';
import { PayrollRun } from '@/hooks/usePayrollRuns';
import { useState } from 'react';
import { PayrollPreviewTable } from './PayrollPreviewTable';
import { Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react';

const statusColor = (s: string) =>
  ({
    draft: 'bg-gray-100 text-gray-700',
    pending_approval: 'bg-amber-100 text-amber-800',
    approved: 'bg-blue-100 text-blue-800',
    disbursed: 'bg-emerald-100 text-emerald-800',
    rejected: 'bg-red-100 text-red-700',
  } as Record<string, string>)[s] || 'bg-gray-100';

export const PayrollRunsList = ({
  runs,
  onApprove,
  onReject,
  showActions,
}: {
  runs: PayrollRun[];
  onApprove?: (id: string) => Promise<void>;
  onReject?: (id: string) => Promise<void>;
  showActions?: boolean;
}) => {
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  if (!runs.length) return <p className="text-muted-foreground text-sm">No payroll runs yet.</p>;

  return (
    <div className="space-y-3">
      {runs.map((r) => (
        <Card key={r.id}>
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">
                {r.month} <span className="text-xs text-muted-foreground">({r.employee_count} staff)</span>
              </CardTitle>
              <Badge className={statusColor(r.status)}>{r.status.replace(/_/g, ' ')}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Created {new Date(r.created_at).toLocaleString()} by {r.created_by}
              {r.approved_at && <> • Approved {new Date(r.approved_at).toLocaleString()} by {r.approved_by}</>}
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
              <Stat label="Gross" value={fmtUGX(r.total_gross)} />
              <Stat label="NSSF 5%" value={fmtUGX(r.total_nssf_employee)} color="text-orange-600" />
              <Stat label="PAYE" value={fmtUGX(r.total_paye)} color="text-orange-600" />
              <Stat label="Net Disbursed" value={fmtUGX(r.total_net)} color="text-emerald-700" />
              <Stat label="NSSF 10% (Employer)" value={fmtUGX(r.total_nssf_employer)} color="text-muted-foreground" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setOpenId(openId === r.id ? null : r.id)}>
                {openId === r.id ? <><EyeOff className="h-4 w-4 mr-1" />Hide</> : <><Eye className="h-4 w-4 mr-1" />View Detail</>}
              </Button>
              {showActions && r.status === 'pending_approval' && (
                <>
                  <Button
                    size="sm"
                    disabled={busy === r.id}
                    onClick={async () => {
                      setBusy(r.id);
                      try { await onApprove?.(r.id); } finally { setBusy(null); }
                    }}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Approve & Disburse
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={busy === r.id}
                    onClick={async () => {
                      setBusy(r.id);
                      try { await onReject?.(r.id); } finally { setBusy(null); }
                    }}
                  >
                    <XCircle className="h-4 w-4 mr-1" /> Reject
                  </Button>
                </>
              )}
            </div>
            {openId === r.id && Array.isArray(r.preview) && (
              <PayrollPreviewTable rows={r.preview as any} />
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

const Stat = ({ label, value, color }: { label: string; value: string; color?: string }) => (
  <div>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className={`font-semibold ${color || ''}`}>{value}</p>
  </div>
);