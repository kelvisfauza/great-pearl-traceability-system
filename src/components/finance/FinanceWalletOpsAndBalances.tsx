import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Landmark, RefreshCw, Send, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ReleaseReceiptDialog } from '@/components/finance/ReleaseReceiptDialog';
import type { ReleaseReceiptData } from '@/utils/financeReleaseReceipt';

const fmt = (n: number) => `UGX ${Math.round(Number(n || 0)).toLocaleString()}`;

/** Finance view: live provider balances + admin wallet operations awaiting Finance release. */
export const FinanceWalletOpsAndBalances: React.FC = () => {
  const [ov, setOv] = useState<any>(null);
  const [ops, setOps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [iws, setIws] = useState<any[]>([]);
  const [iwRecent, setIwRecent] = useState<any[]>([]);
  const [iwRejecting, setIwRejecting] = useState<string | null>(null);
  const [iwReason, setIwReason] = useState('');
  const [receipt, setReceipt] = useState<ReleaseReceiptData | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    if (!quiet) supabase.functions.invoke('sync-yo-balance').catch(() => {});
    const [{ data: o }, { data: l }, { data: iw }] = await Promise.all([
      (supabase as any).rpc('get_treasury_accounts_overview'),
      supabase.functions.invoke('admin-wallet-operation', { body: { action: 'finance_list' } }),
      supabase.functions.invoke('dispatch-gosente-instant', { body: { action: 'finance_list', instant_withdrawal_id: 'x' } }),
    ]);
    setIws(iw?.ok ? iw.withdrawals : []);
    setIwRecent(iw?.ok ? (iw.recent || []) : []);
    setOv(o?.ok ? o : null);
    setOps(l?.ok ? l.operations : []);
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
    const t = setInterval(() => load(true), 30000);
    const onFocus = () => load(true);
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(t); window.removeEventListener('focus', onFocus); };
  }, [load]);

  const rejectIw = async (w: any) => {
    if (!iwReason.trim()) { toast.error('Give a reason'); return; }
    setBusy(w.id);
    const { data, error } = await supabase.functions.invoke('dispatch-gosente-instant', { body: { instant_withdrawal_id: w.id, action: 'finance_reject', reason: iwReason } });
    setBusy(null);
    if (error || !data?.ok) { toast.error(data?.error || error?.message || 'Reject failed'); return; }
    toast.success(`Rejected — UGX ${Number(data.refunded || 0).toLocaleString()} returned to wallet`);
    setIwRejecting(null); setIwReason(''); load(true);
  };

  const release = async (op: any) => {
    setBusy(op.id);
    const { data, error } = await supabase.functions.invoke('admin-wallet-operation', { body: { action: 'finance_release', operation_id: op.id } });
    setBusy(null);
    if (error || !data?.ok) { toast.error(data?.error || error?.message || 'Release failed'); return; }
    const { data: s } = await supabase.auth.getSession();
    setReceipt({
      reference: data.reference || op.id.slice(0, 8), title: `Admin wallet ${op.operation_type}`, amount: Number(op.amount),
      recipientName: op.target_name || op.target_email, phone: op.destination_phone || undefined,
      channel: op.payout_provider === 'gosentepay' ? 'gosente' : (op.payout_provider || 'wallet'),
      releasedBy: s?.session?.user?.email || 'Finance', requestId: op.id,
      approvals: [{ label: 'Created by', by: op.initiated_by_name }, { label: 'Admin approval', by: op.approved_by_name, at: op.approved_at }],
    });
    load();
  };
  const releaseIw = async (w: any) => {
    setBusy(w.id);
    const { data, error } = await supabase.functions.invoke('dispatch-gosente-instant', { body: { instant_withdrawal_id: w.id } });
    setBusy(null);
    if (error || !data?.ok) { toast.error(data?.error || error?.message || 'Payout failed — still waiting, you can retry'); load(); return; }
    const { data: s } = await supabase.auth.getSession();
    setReceipt({
      reference: data.ref || w.payout_ref, title: 'Instant withdrawal (GosentePay)', amount: Number(w.amount),
      recipientName: w.employee_name, phone: w.phone_number, channel: 'gosente',
      releasedBy: s?.session?.user?.email || 'Finance', requestId: w.id,
      approvals: [{ label: 'Admin approval', by: w.admin_approved_by, at: w.admin_approved_at }],
    });
    load();
  };
  const sendBackIw = async (w: any) => {
    setBusy(w.id);
    const { data, error } = await supabase.functions.invoke('dispatch-gosente-instant', { body: { instant_withdrawal_id: w.id, action: 'send_back' } });
    setBusy(null);
    if (error || !data?.ok) { toast.error(data?.error || error?.message || 'Failed'); return; }
    toast.success('Sent back to admin'); load();
  };
  const reject = async (id: string) => {
    if (!reason.trim()) { toast.error('Give a reason'); return; }
    setBusy(id);
    const { data, error } = await supabase.functions.invoke('admin-wallet-operation', { body: { action: 'reject', operation_id: id, rejected_reason: reason } });
    setBusy(null);
    if (error || !data?.ok) { toast.error(data?.error || error?.message || 'Reject failed'); return; }
    toast.success('Rejected'); setRejecting(null); setReason(''); load();
  };

  const waiting = ops.filter(o => o.status === 'awaiting_finance');
  const done = ops.filter(o => o.status !== 'awaiting_finance').slice(0, 15);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2"><Landmark className="h-5 w-5 text-primary" /> Account balances</CardTitle>
            <CardDescription>Live money available with payment providers and in company accounts</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></Button>
        </CardHeader>
        <CardContent>
          {!ov ? <p className="text-sm text-muted-foreground">{loading ? 'Loading…' : 'Balances unavailable for your account.'}</p> : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 border rounded-lg"><p className="text-xs text-muted-foreground">Yo Payments</p><p className="text-xl font-bold">{fmt(ov.yo_balance)}</p>
                  {ov.yo_synced_at && <p className="text-xs text-muted-foreground">Updated {new Date(ov.yo_synced_at).toLocaleString()}</p>}</div>
                <div className="p-3 border rounded-lg"><p className="text-xs text-muted-foreground">GosentePay</p><p className="text-xl font-bold">{fmt(ov.gosente_balance)}</p></div>
                <div className="p-3 border rounded-lg"><p className="text-xs text-muted-foreground">Total with providers</p><p className="text-xl font-bold">{fmt(ov.actual_float)}</p>
                  <p className={`text-xs ${Number(ov.drift) < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>Difference vs accounts: {fmt(ov.drift)}</p></div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {(ov.accounts || []).map((a: any) => (
                  <div key={a.code} className="p-2 border rounded-md">
                    <p className="text-xs text-muted-foreground truncate">{a.name}</p>
                    <p className={`font-semibold ${Number(a.balance) < Number(a.low_balance_threshold) ? 'text-destructive' : ''}`}>{fmt(a.balance)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Send className="h-5 w-5 text-primary" /> Instant withdrawals — awaiting Finance ({iws.length})</CardTitle>
          <CardDescription>Approved by admin. Money is sent by GosentePay only when Finance releases.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {iws.length === 0 && <p className="text-sm text-muted-foreground">Nothing waiting.</p>}
          {iws.map(w => (
            <div key={w.id} className="p-3 border rounded-lg flex flex-wrap justify-between gap-2">
              <div>
                <p className="font-medium">{w.employee_name} — {fmt(w.amount)}</p>
                <p className="text-sm text-muted-foreground">GosentePay • {w.phone_number} • Approved by {w.admin_approved_by || 'admin'}</p>
                {w.last_error && <p className="text-xs text-destructive">Last attempt failed: {w.last_error}</p>}
              </div>
              <div className="flex gap-2">
                <Button size="sm" disabled={busy === w.id} onClick={() => releaseIw(w)}>Release</Button>
                <Button size="sm" variant="outline" disabled={busy === w.id} onClick={() => sendBackIw(w)}>Send back</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Send className="h-5 w-5 text-primary" /> Admin wallet operations — awaiting Finance ({waiting.length})</CardTitle>
          <CardDescription>Approved by admin. Money moves only after Finance releases.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {waiting.length === 0 && <p className="text-sm text-muted-foreground">Nothing waiting.</p>}
          {waiting.map(op => (
            <div key={op.id} className="p-3 border rounded-lg space-y-2">
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <p className="font-medium capitalize">{op.operation_type} — {op.target_name || op.target_email}</p>
                  <p className="text-sm text-muted-foreground">{fmt(op.amount)}{op.payout_provider ? ` • ${op.payout_provider}` : ''}{op.destination_phone ? ` • ${op.destination_phone}` : ''}{op.destination_email ? ` → ${op.destination_email}` : ''}</p>
                  <p className="text-xs text-muted-foreground">Reason: {op.reason} • By {op.initiated_by_name} • Approved by {op.approved_by_name}</p>
                  {op.execution_error && <p className="text-xs text-destructive">Last error: {op.execution_error}</p>}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setRejecting(rejecting === op.id ? null : op.id)}><XCircle className="h-4 w-4 mr-1" /> Reject</Button>
                  <Button size="sm" onClick={() => release(op)} disabled={busy === op.id}><Send className="h-4 w-4 mr-1" /> {busy === op.id ? 'Releasing…' : 'Release'}</Button>
                </div>
              </div>
              {rejecting === op.id && (
                <div className="flex gap-2">
                  <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason for rejecting" className="min-h-[40px]" />
                  <Button size="sm" variant="destructive" onClick={() => reject(op.id)} disabled={busy === op.id}>Confirm</Button>
                </div>
              )}
            </div>
          ))}
          {done.length > 0 && (
            <div className="pt-3 border-t space-y-1">
              <p className="text-sm font-medium">Recent</p>
              {done.map(op => (
                <div key={op.id} className="flex flex-wrap gap-2 text-sm items-center">
                  <span className="capitalize">{op.operation_type}</span>
                  <span className="flex-1 truncate">{op.target_name || op.target_email} — {fmt(op.amount)}</span>
                  <span className="text-xs text-muted-foreground">{op.finance_released_by_name ? `Released by ${op.finance_released_by_name}` : op.approved_by_name ? `By ${op.approved_by_name}` : ''}</span>
                  <Badge variant={op.status === 'completed' ? 'default' : op.status === 'failed' ? 'destructive' : 'secondary'}>{op.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <ReleaseReceiptDialog data={receipt} onClose={() => setReceipt(null)} />
    </div>
  );
};

export default FinanceWalletOpsAndBalances;
