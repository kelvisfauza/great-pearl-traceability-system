import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Wallet, Eye, Lock, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserAccount } from '@/hooks/useUserAccount';
import { useBalanceReveal } from '@/hooks/useBalanceReveal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const ENTRY_TYPES = ['LOYALTY_REWARD', 'BONUS', 'DEPOSIT', 'WITHDRAWAL', 'ADJUSTMENT', 'REVERSAL', 'MONTHLY_SALARY', 'ADVANCE_RECOVERY', 'LOAN_DISBURSEMENT', 'LOAN_REPAYMENT', 'LOAN_RECOVERY', 'HOST_MEETING_BONUS', 'MEETING_ATTENDANCE_BONUS'];

type Entry = { id: string; amount: number; entry_type: string; created_at: string; metadata: any };

const label = (e: Entry) => {
  let m = e.metadata;
  if (typeof m === 'string') { try { m = JSON.parse(m); } catch { m = null; } }
  return m?.description || e.entry_type.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
};

/** Dashboard wallet snapshot: balance + last 3 movements. Full details live in the Vault. */
const WalletSnapshotCard = () => {
  const navigate = useNavigate();
  const { user, employee } = useAuth();
  const { account } = useUserAccount();
  const { revealed, reveal, busy } = useBalanceReveal();
  const [entries, setEntries] = useState<Entry[] | null>(null);

  useEffect(() => {
    if (!revealed) return;
    let cancelled = false;
    (async () => {
      const email = employee?.email || user?.email;
      let uid = user?.id || null;
      if (email) {
        const { data } = await supabase.rpc('get_unified_user_id', { input_email: email });
        uid = (data as string) || uid;
      }
      if (!uid) return;
      const { data } = await supabase
        .from('ledger_entries')
        .select('id, amount, entry_type, created_at, metadata')
        .eq('user_id', uid)
        .eq('is_hidden', false)
        .in('entry_type', ENTRY_TYPES)
        .order('created_at', { ascending: false })
        .limit(3);
      if (!cancelled) setEntries((data as Entry[]) || []);
    })();
    return () => { cancelled = true; };
  }, [revealed, user?.id, user?.email, employee?.email]);

  const balance = Number(account?.wallet_balance || 0);

  return (
    <Card className="border-border/30 overflow-hidden">
      <CardHeader className="pb-2 border-b border-border/20 pt-3 px-4 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-bold flex items-center gap-2"><Wallet className="h-4 w-4 text-primary" />My Wallet</CardTitle>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => navigate('/vault')}>
          <Lock className="h-3.5 w-3.5" />Open Vault
        </Button>
      </CardHeader>
      <CardContent className="pt-3 space-y-3">
        {!revealed ? (
          <Button variant="secondary" className="w-full gap-2" onClick={reveal} disabled={busy}>
            <Eye className="h-4 w-4" />{busy ? 'Loading…' : 'Show balance'}
          </Button>
        ) : (
          <>
            <div>
              <p className="text-xs text-muted-foreground">Wallet balance</p>
              <p className="text-2xl font-bold text-foreground">UGX {balance.toLocaleString()}</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Last 3 transactions</p>
              {entries === null && <p className="text-xs text-muted-foreground">Loading…</p>}
              {entries?.length === 0 && <p className="text-xs text-muted-foreground">No transactions yet.</p>}
              {entries?.map((e) => {
                const credit = Number(e.amount) >= 0;
                return (
                  <div key={e.id} className="flex items-center justify-between gap-2 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      {credit ? <ArrowDownLeft className="h-4 w-4 text-success shrink-0" /> : <ArrowUpRight className="h-4 w-4 text-destructive shrink-0" />}
                      <div className="min-w-0">
                        <p className="truncate">{label(e)}</p>
                        <p className="text-[10px] text-muted-foreground">{format(new Date(e.created_at), 'dd MMM yyyy, HH:mm')}</p>
                      </div>
                    </div>
                    <span className={credit ? 'text-success font-medium' : 'text-destructive font-medium'}>
                      {credit ? '+' : '−'}{Math.abs(Number(e.amount)).toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
        <p className="text-[10px] text-muted-foreground">Open the Vault for full statement, withdrawals and more.</p>
      </CardContent>
    </Card>
  );
};

export default WalletSnapshotCard;
