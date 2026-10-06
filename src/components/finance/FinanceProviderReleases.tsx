import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Banknote, Smartphone, Wallet, HandCoins } from 'lucide-react';
import ReleaseReceiptDialog from '@/components/finance/ReleaseReceiptDialog';
import PartPayControl from '@/components/finance/PartPayControl';

type PayMethod = 'momo' | 'gosente' | 'cash';

/** Provider / meal-plan / per-diem requests approved by Admin, waiting for Finance to release the money. */
const FinanceProviderReleases: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [releasing, setReleasing] = useState<string | null>(null);
  const [method, setMethod] = useState<Record<string, PayMethod>>({});
  const [receipt, setReceipt] = useState<any>(null);

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ['finance-provider-releases'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('process-provider-submission', {
        body: { action: 'finance_list' },
      });
      if (error) throw error;
      if (!(data as any)?.ok) throw new Error((data as any)?.error || 'Failed to load');
      return (data as any).submissions || [];
    },
    refetchInterval: 30000,
  });

  const release = async (s: any) => {
    const mode = method[s.id] || 'momo';
    setReleasing(s.id);
    try {
      const { data, error } = await supabase.functions.invoke('process-provider-submission', {
        body: { action: 'finance_release', submissionId: s.id, paymentMode: mode },
      });
      if (error) throw error;
      if (!(data as any)?.ok) throw new Error((data as any)?.error || 'Release failed');
      toast({ title: 'Released', description: (data as any)?.message || 'Payment released' });
      const amt = Number(s.admin_approved_amount ?? s.amount);
      const chg = Number(s.admin_approved_charge ?? 0);
      setReceipt({
        reference: ((data as any)?.ref || (data as any)?.recordId || s.id).toString(),
        title:
          s.request_type === 'meal_plan'
            ? 'Meal Plan Payment'
            : s.request_type === 'support_staff_per_diem'
              ? 'Support Staff Per-Diem'
              : 'Service Provider Payment',
        amount: amt + chg,
        recipientName: s.provider_name,
        phone: s.phone,
        channel: mode === 'momo' ? 'yo' : mode,
        releasedBy: 'Finance',
        requestId: s.id,
        approvals: s.admin_approved_by_name
          ? [{ label: 'Admin approval', by: s.admin_approved_by_name, at: s.reviewed_at }]
          : [],
      });
      queryClient.invalidateQueries({ queryKey: ['finance-provider-releases'] });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setReleasing(null);
    }
  };

  const reject = async (s: any) => {
    const reason = window.prompt(`Reason for rejecting ${s.provider_name}'s request?`);
    if (!reason || !reason.trim()) return;
    setReleasing(s.id);
    try {
      const { data, error } = await supabase.functions.invoke('process-provider-submission', {
        body: { action: 'reject', submissionId: s.id, rejectionReason: reason.trim() },
      });
      if (error) throw error;
      if (!(data as any)?.ok) throw new Error((data as any)?.error || 'Reject failed');
      toast({ title: 'Rejected', description: 'Marked as rejected — no money was paid out, it stays in the company account.' });
      queryClient.invalidateQueries({ queryKey: ['finance-provider-releases'] });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setReleasing(null);
    }
  };

  // Keep the receipt prompt mounted even after the last item leaves the list.
  if (!isLoading && submissions.length === 0) {
    return receipt ? <ReleaseReceiptDialog data={receipt} onClose={() => setReceipt(null)} /> : null;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <HandCoins className="w-5 h-5 text-primary" />
        <CardTitle>Provider Payments — Awaiting Finance Release</CardTitle>
        {submissions.length > 0 && <Badge variant="secondary">{submissions.length}</Badge>}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading...
          </div>
        ) : (
          <div className="space-y-3">
            {submissions.map((s: any) => {
              const amt = Number(s.admin_approved_amount ?? s.amount);
              const chg = Number(s.admin_approved_charge ?? 0);
              const m = method[s.id] || 'momo';
              return (
                <div key={s.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold">{s.provider_name}</p>
                        <Badge variant={s.request_type === 'meal_plan' ? 'secondary' : 'default'}>
                          {s.request_type === 'meal_plan'
                            ? 'Meal Plan'
                            : s.request_type === 'support_staff_per_diem'
                              ? 'Per-Diem'
                              : 'Service Provider'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{s.phone} {s.email && `• ${s.email}`}</p>
                      {s.invoice_number && (
                        <p className="text-xs text-muted-foreground">Invoice: {s.invoice_number}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Approved by Admin: <strong>{s.admin_approved_by_name || s.reviewed_by_name || 'Admin'}</strong>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">UGX {(amt + chg).toLocaleString()}</p>
                      {chg > 0 && (
                        <p className="text-xs text-muted-foreground">incl. UGX {chg.toLocaleString()} charge</p>
                      )}
                    </div>
                  </div>
                  <p className="text-sm bg-muted/50 p-2 rounded">{s.description}</p>
                  {s.payout_status === 'failed' && (
                    <div className="text-xs bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded px-2 py-1.5">
                      <strong>Previous payout failed.</strong> {s.payout_message || 'The payment provider rejected it.'} Fix the issue and release again.
                    </div>
                  )}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex gap-2">
                      {([
                        { id: 'momo', label: 'Yo Payments', icon: Smartphone },
                        { id: 'gosente', label: 'GosentePay', icon: Wallet },
                        { id: 'cash', label: 'Cash', icon: Banknote },
                      ] as const).map((opt) => {
                        const Icon = opt.icon;
                        const active = m === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setMethod((prev) => ({ ...prev, [s.id]: opt.id }))}
                            disabled={releasing === s.id}
                            className={`rounded-md border px-2.5 py-1.5 text-xs flex items-center gap-1.5 transition ${
                              active ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-border hover:bg-muted'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" /> {opt.label}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex gap-2 items-end">
                    <PartPayControl sourceType="provider" sourceId={s.id} totalAmount={amt + chg} payeeName={s.provider_name}
                      onChanged={() => queryClient.invalidateQueries({ queryKey: ['finance-provider-releases'] })} />
                    <Button size="sm" variant="outline" disabled={releasing === s.id} onClick={() => reject(s)}>Reject</Button>
                    <Button size="sm" onClick={() => release(s)} disabled={releasing === s.id}>
                      {releasing === s.id ? (
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      ) : (
                        <HandCoins className="w-3 h-3 mr-1" />
                      )}
                      {m === 'cash' ? 'Confirm Cash Payout' : m === 'gosente' ? 'Release via GosentePay' : 'Release via Yo Payments'}
                    </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
      <ReleaseReceiptDialog data={receipt} onClose={() => setReceipt(null)} />
    </Card>
  );
};

export default FinanceProviderReleases;
