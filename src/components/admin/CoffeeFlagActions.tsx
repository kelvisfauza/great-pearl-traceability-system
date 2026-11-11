import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export const COFFEE_FLAG_RULES = ['delivery_duplicate', 'lot_price_mismatch', 'lot_unassessed_extra', 'batch_source_repeat'];

type Rec = { delivery_id: string; delivery_number?: string; recorded_at?: string; recorded_by?: string; status?: string; in_stock_batch?: boolean; quality_price?: number | null; finance?: { lot_id: string; price: number; total: number; status: string }[] | null };
const ugx = (n: unknown) => (n == null ? '—' : `UGX ${Number(n).toLocaleString()}`);

export default function CoffeeFlagActions({ ruleKey, fingerprint, details, onDone }: { ruleKey: string; fingerprint: string; details: Record<string, any>; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [price, setPrice] = useState<string>(String(details.quality_price ?? ''));

  const run = async (action: string, target: string, keep?: string, value?: number, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    try {
      const { data, error } = await (supabase.rpc as any)('resolve_coffee_flag', { p_action: action, p_target: target, p_keep: keep ?? null, p_value: value ?? null, p_note: note || null });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || 'Could not resolve');
      toast.success(data.paid_to_recover > 0 ? `Done. ${ugx(data.paid_to_recover)} was already paid and is flagged to recover.` : 'Done');
      onDone();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not resolve'); }
    finally { setBusy(false); }
  };

  const records: Rec[] = details.records || [];
  const unpaid = details.finance_status !== 'PAID';

  return (
    <div className="space-y-3 rounded-md border p-3">
      <p className="text-sm font-medium">Resolve</p>
      {ruleKey === 'delivery_duplicate' && records.map((r, i) => (
        <div key={r.delivery_id} className="space-y-1 rounded border p-2 text-xs">
          <div className="flex flex-wrap items-center gap-2"><span className="font-medium">Copy {i + 1}: {r.delivery_number || r.delivery_id}</span>{r.in_stock_batch && <Badge variant="outline">In stock batch</Badge>}<span className="text-muted-foreground">by {r.recorded_by || '—'} · {r.recorded_at ? new Date(r.recorded_at).toLocaleString('en-GB') : ''}</span></div>
          <div>Quality price: {ugx(r.quality_price)}</div>
          {(r.finance || []).map(f => <div key={f.lot_id}>Finance: {ugx(f.price)}/kg · {ugx(f.total)} · <Badge variant={f.status === 'PAID' ? 'destructive' : 'secondary'}>{f.status}</Badge></div>)}
          <div className="flex flex-wrap gap-2 pt-1">
            {records.filter(o => o.delivery_id !== r.delivery_id).map(o => (
              <Button key={o.delivery_id} size="sm" variant="destructive" disabled={busy} onClick={() => run('mark_duplicate', r.delivery_id, o.delivery_id, undefined, `Mark copy ${i + 1} as a duplicate of ${o.delivery_number || o.delivery_id}? It will be removed from stock batches and unpaid Finance entries deleted. Paid amounts are flagged to recover.`)}>
                Duplicate – keep {o.delivery_number || 'other'}
              </Button>
            ))}
          </div>
        </div>
      ))}
      {ruleKey === 'lot_unassessed_extra' && (
        <Button size="sm" variant="destructive" disabled={busy || !unpaid} onClick={() => run('delete_lot', details.lot_id, undefined, undefined, 'Delete this leftover Finance entry?')}>Delete leftover entry</Button>
      )}
      {ruleKey === 'lot_price_mismatch' && (
        <div className="flex flex-wrap items-center gap-2">
          <Input className="w-36" type="number" value={price} onChange={e => setPrice(e.target.value)} aria-label="Price per kg" disabled={!unpaid} />
          <Button size="sm" disabled={busy || !unpaid} onClick={() => run('set_lot_price', details.lot_id, undefined, Number(price))}>Set Finance price</Button>
          {!unpaid && <span className="text-xs text-muted-foreground">Already paid – record the difference and accept.</span>}
        </div>
      )}
      <Input placeholder="Reason / note (needed to accept)" value={note} onChange={e => setNote(e.target.value)} aria-label="Resolution note" />
      <Button size="sm" variant="outline" disabled={busy || !note.trim()} onClick={() => run('dismiss', fingerprint)}>Accept as correct</Button>
    </div>
  );
}
