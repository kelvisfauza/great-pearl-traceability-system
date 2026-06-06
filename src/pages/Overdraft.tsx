import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Wallet, TrendingDown, Info, ShieldAlert, Loader2, Lock, AlertTriangle } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';

const Overdraft = () => {
  const { employee, user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const email = employee?.email || user?.email || '';
  const [busy, setBusy] = useState(false);

  // Current month eligibility
  const { data: eligibility } = useQuery({
    queryKey: ['my-overdraft-eligibility', email],
    enabled: !!email,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('overdraft_eligibility')
        .select('*')
        .eq('employee_email', email)
        .order('period', { ascending: false })
        .limit(1);
      return data?.[0] || null;
    },
  });

  // Active account
  const { data: account } = useQuery({
    queryKey: ['my-overdraft-account', email],
    enabled: !!email,
    queryFn: async () => {
      const { data } = await (supabase as any).rpc('get_overdraft_account', { user_email: email });
      return data?.[0] || null;
    },
    refetchInterval: 15000,
  });

  // Recent transactions
  const { data: txs = [] } = useQuery({
    queryKey: ['my-overdraft-tx', account?.id],
    enabled: !!account?.id,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('overdraft_transactions')
        .select('*')
        .eq('account_id', account.id)
        .order('created_at', { ascending: false })
        .limit(100);
      return data || [];
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['my-overdraft-account'] });
    qc.invalidateQueries({ queryKey: ['my-overdraft-tx'] });
    qc.invalidateQueries({ queryKey: ['my-overdraft-eligibility'] });
  };

  useEffect(() => {
    if (!email) return;

    const channel = supabase.channel(`overdraft-rt-${email}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'overdraft_accounts',
        filter: `employee_email=eq.${email}`,
      }, () => {
        refresh();
      });

    if (account?.id) {
      channel.on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'overdraft_transactions',
        filter: `account_id=eq.${account.id}`,
      }, () => {
        refresh();
      });
    }

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [email, account?.id]);

  const handleToggle = async (action: 'activate' | 'deactivate') => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('overdraft-activate', {
        body: { user_email: email, action },
      });
      if (error || !(data as any)?.ok) {
        throw new Error((data as any)?.error || error?.message || 'Failed');
      }
      toast({
        title: action === 'activate' ? 'Overdraft Activated' : 'Overdraft Closed',
        description: action === 'activate'
          ? `Limit: UGX ${Number((data as any).limit || 0).toLocaleString()}. It will be used automatically when your wallet runs short.`
          : 'Your overdraft account is now closed.',
      });
      refresh();
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const fmt = (n: any) => `UGX ${Number(n || 0).toLocaleString()}`;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto p-4 md:p-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <TrendingDown className="h-7 w-7 text-primary" /> Overdraft
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Spend up to your overdraft limit when your wallet runs short. No approval needed.
          </p>
        </div>

        {/* How it works */}
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="pt-4 text-sm flex gap-3">
            <Info className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p><strong>Auto-used:</strong> When you withdraw, transfer, or pay a loan and your wallet is short, the overdraft fills the gap automatically.</p>
              <p><strong>Monthly limit:</strong> The system sets your limit on the 1st of each month from your wallet activity (50% of avg monthly inflow, capped at 50% of salary and UGX 2,000,000).</p>
              <p><strong>Interest:</strong> 0.5% per day on the outstanding balance until cleared.</p>
              <p><strong>Auto-recovery:</strong> Any future credit (salary, loyalty, deposits) clears outstanding first; the rest lands in your wallet.</p>
              <p><strong>30-day rule:</strong> If outstanding is not cleared within 30 days, the overdraft is frozen until you repay.</p>
              <p><strong>No fees</strong> for activation. Opt in below.</p>
            </div>
          </CardContent>
        </Card>

        {/* System-assigned limit */}
        {eligibility && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">System-assigned limit · {eligibility.period}</p>
              <p className="text-2xl font-bold text-primary">{fmt(eligibility.computed_limit)}</p>
              <p className="text-xs text-muted-foreground mt-1">Reviewed monthly on the 1st.</p>
            </CardContent>
          </Card>
        )}

        {/* Account state */}
        {!account ? (
          <Card>
            <CardContent className="pt-6 text-center space-y-4">
              <ShieldAlert className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">You haven't activated overdraft yet.</p>
              <Button onClick={() => handleToggle('activate')} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wallet className="h-4 w-4 mr-2" />}
                Activate Overdraft
              </Button>
              {(!eligibility || Number(eligibility?.computed_limit || 0) <= 0) && (
                <p className="text-xs text-muted-foreground">
                  No limit available yet — build some wallet activity over a few weeks and try again on the 1st.
                </p>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Limit</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold">{fmt(account.approved_limit)}</div></CardContent>
              </Card>
              <Card className="border-destructive/30">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Outstanding</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">{fmt(account.outstanding_balance)}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {Number(account.total_interest || 0) > 0 ? `Includes ${fmt(account.total_interest)} interest. ` : ''}
                    {Number(account.outstanding_balance || 0) > 0
                      ? `Day ${Math.max(1, Number(account.days_negative || 0))}/30.`
                      : 'Cleared.'}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Available</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-600">{fmt(account.available_overdraft)}</div>
                  {account.frozen && (
                    <Badge variant="destructive" className="mt-2"><Lock className="h-3 w-3 mr-1" /> Frozen</Badge>
                  )}
                </CardContent>
              </Card>
            </div>

            {account.frozen && (
              <Card className="border-destructive bg-destructive/5">
                <CardContent className="pt-4 flex gap-3 text-sm">
                  <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Overdraft frozen</p>
                    <p className="text-muted-foreground">Outstanding balance was not cleared within 30 days. New overdraft draws are paused; any incoming credits will be applied automatically until cleared.</p>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleToggle('deactivate')}
                disabled={busy || Number(account.outstanding_balance || 0) > 0}
              >
                Close Overdraft Account
              </Button>
            </div>

            <Card>
              <CardHeader><CardTitle>Activity</CardTitle></CardHeader>
              <CardContent>
                {txs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No activity yet.</p>
                ) : (
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="text-right">Outstanding After</TableHead><TableHead>Ref</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {txs.map((t: any) => (
                        <TableRow key={t.id}>
                          <TableCell className="text-xs">{new Date(t.created_at).toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant={t.transaction_type === 'recovery' ? 'default' : t.transaction_type === 'interest' ? 'secondary' : 'outline'}>
                              {t.transaction_type}
                            </Badge>
                          </TableCell>
                          <TableCell className={`text-right ${t.transaction_type === 'recovery' ? 'text-emerald-700' : 'text-destructive'}`}>
                            {fmt(t.amount)}
                          </TableCell>
                          <TableCell className="text-right">{fmt(t.balance_after)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{t.reference || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Overdraft;