import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, History, ChevronDown, ChevronUp } from 'lucide-react';

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
  awaiting_finance: 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300',
  processing: 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300',
  paid: 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300',
  completed: 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300',
  failed: 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Awaiting Admin',
  awaiting_finance: 'Awaiting Finance',
  processing: 'Processing',
  paid: 'Paid',
  completed: 'Paid',
  failed: 'Failed',
  rejected: 'Rejected',
};

const typeLabel = (t: string) =>
  t === 'meal_plan' ? 'Meal Plan' : t === 'support_staff_per_diem' ? 'Per-Diem' : 'Service Provider';

const fmtDate = (v: string | null | undefined) =>
  v ? new Date(v).toLocaleString('en-UG', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

/** Finance tracking view: every provider / meal-plan / per-diem request with its
 *  current status and full details, so Finance can review outcomes after approval. */
const FinancePaymentHistory: React.FC = () => {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ['finance-payment-history'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('process-provider-submission', {
        body: { action: 'finance_history' },
      });
      if (error) throw error;
      if (!(data as any)?.ok) throw new Error((data as any)?.error || 'Failed to load');
      return (data as any).submissions || [];
    },
    refetchInterval: 60000,
  });

  const visible = showAll ? submissions : submissions.slice(0, 10);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <History className="w-5 h-5 text-primary" />
        <CardTitle>Payment Tracking — Meal Plans & Provider Payments</CardTitle>
        {submissions.length > 0 && <Badge variant="secondary">{submissions.length}</Badge>}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading...
          </div>
        ) : submissions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No payment requests yet.</p>
        ) : (
          <div className="space-y-2">
            {visible.map((s: any) => {
              const amt = Number(s.admin_approved_amount ?? s.amount);
              const chg = Number(s.admin_approved_charge ?? 0);
              const open = expanded === s.id;
              return (
                <div key={s.id} className="border rounded-lg">
                  <button
                    type="button"
                    onClick={() => setExpanded(open ? null : s.id)}
                    className="w-full flex items-center justify-between gap-2 p-3 text-left hover:bg-muted/50 rounded-lg"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold truncate">{s.provider_name}</p>
                        <Badge variant="outline">{typeLabel(s.request_type)}</Badge>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[s.status] || 'bg-muted text-muted-foreground'}`}>
                          {STATUS_LABELS[s.status] || s.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {fmtDate(s.created_at)} • {s.phone}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <p className="font-bold">UGX {(amt + chg).toLocaleString()}</p>
                      {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>
                  {open && (
                    <div className="border-t px-3 py-3 text-sm space-y-1.5 bg-muted/30">
                      <p><span className="text-muted-foreground">Description:</span> {s.description}</p>
                      {s.invoice_number && <p><span className="text-muted-foreground">Invoice:</span> {s.invoice_number}</p>}
                      {s.email && <p><span className="text-muted-foreground">Email:</span> {s.email}</p>}
                      <p><span className="text-muted-foreground">Requested:</span> UGX {Number(s.amount).toLocaleString()}</p>
                      {s.admin_approved_amount != null && (
                        <p><span className="text-muted-foreground">Approved amount:</span> UGX {(Number(s.admin_approved_amount) + chg).toLocaleString()}
                          {chg > 0 && ` (incl. UGX ${chg.toLocaleString()} charge)`}</p>
                      )}
                      {s.admin_approved_by_name && (
                        <p><span className="text-muted-foreground">Approved by Admin:</span> {s.admin_approved_by_name} • {fmtDate(s.reviewed_at)}</p>
                      )}
                      {s.finance_released_by_name && (
                        <p><span className="text-muted-foreground">Released by Finance:</span> {s.finance_released_by_name}</p>
                      )}
                      {s.payout_status && (
                        <p><span className="text-muted-foreground">Payout:</span> {s.payout_status}{s.payout_message ? ` — ${s.payout_message}` : ''}</p>
                      )}
                      {s.rejection_reason && (
                        <p className="text-red-600 dark:text-red-400"><span className="text-muted-foreground">Rejection reason:</span> {s.rejection_reason}</p>
                      )}
                      <p><span className="text-muted-foreground">Reference:</span> {String(s.id).slice(-8).toUpperCase()}</p>
                      <p><span className="text-muted-foreground">Last update:</span> {fmtDate(s.updated_at)}</p>
                    </div>
                  )}
                </div>
              );
            })}
            {submissions.length > 10 && (
              <Button variant="ghost" size="sm" className="w-full" onClick={() => setShowAll(!showAll)}>
                {showAll ? 'Show less' : `Show all ${submissions.length} requests`}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FinancePaymentHistory;
