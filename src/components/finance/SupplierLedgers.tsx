import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Search, Loader2, Printer } from 'lucide-react';
import { buildSupplierLedger } from '@/lib/supplierLedger';

const ugx = (n: number) => `UGX ${Math.round(n).toLocaleString()}`;
const sb = supabase as any;

export default function SupplierLedgers() {
  const { toast } = useToast();
  const { employee } = useAuth() as any;
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{ deliveries: any[]; payments: any[] }>({ deliveries: [], payments: [] });
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ amount: '', date: new Date().toISOString().slice(0, 10), method: 'CASH', reference: '', notes: '' });

  useEffect(() => {
    sb.from('suppliers').select('id, name, code, phone, opening_balance').order('name').limit(2000)
      .then(({ data, error }: any) => { if (error) setError(error.message); else setSuppliers(data || []); });
  }, []);

  const load = async (s: any) => {
    setLoading(true); setError(null);
    const [rec, lots, pays] = await Promise.all([
      sb.from('coffee_records').select('id, date, kilograms, coffee_type, batch_number, status').eq('supplier_id', s.id).order('date').limit(5000),
      sb.from('finance_coffee_lots').select('coffee_record_id, unit_price_ugx, total_amount_ugx, quantity_kg').eq('supplier_id', s.id).limit(5000),
      sb.from('supplier_payments').select('id, payment_date, amount_paid_ugx, method, reference, notes, status, is_duplicate, lot_id').eq('supplier_id', s.id).neq('status', 'VOID').limit(5000),
    ]);
    const err = rec.error || lots.error || pays.error;
    if (err) { setError(err.message); setLoading(false); return; }
    const lotBy = new Map((lots.data || []).map((l: any) => [l.coffee_record_id, l]));
    const deliveries = (rec.data || []).filter((r: any) => !['duplicate', 'rejected', 'deleted'].includes(String(r.status || '').toLowerCase())).map((r: any) => {
      const lot: any = lotBy.get(r.id);
      const value = lot ? Number(lot.total_amount_ugx || (lot.unit_price_ugx * (lot.quantity_kg || r.kilograms)) || 0) : 0;
      return { date: r.date, kg: Number(r.kilograms) || 0, value, priced: !!lot, description: `Delivery ${r.batch_number || ''} · ${r.coffee_type || ''}${lot ? ` @ ${Number(lot.unit_price_ugx || 0).toLocaleString()}/kg` : ' · not yet priced'}` };
    });
    const payments = (pays.data || []).filter((p: any) => !p.is_duplicate).map((p: any) => ({
      date: p.payment_date, amount: Number(p.amount_paid_ugx) || 0,
      description: `Payment · ${String(p.method).replace('_', ' ').toLowerCase()}${p.reference ? ` · ${p.reference}` : ''}${p.lot_id ? '' : ' (recorded)'}${p.notes ? ` · ${p.notes}` : ''}`,
    }));
    setData({ deliveries, payments });
    setLoading(false);
  };

  const ledger = useMemo(() => sel ? buildSupplierLedger(Number(sel.opening_balance) || 0, data.deliveries, data.payments) : null, [sel, data]);
  const filtered = suppliers.filter(s => !q || `${s.name} ${s.code} ${s.phone}`.toLowerCase().includes(q.toLowerCase())).slice(0, 50);

  const save = async () => {
    const amount = Number(form.amount);
    if (!sel || !(amount > 0)) { toast({ title: 'Enter an amount', variant: 'destructive' }); return; }
    setSaving(true);
    const { error } = await sb.from('supplier_payments').insert({
      supplier_id: sel.id, lot_id: null, method: form.method, status: 'POSTED',
      requested_by: employee?.email || 'finance', approved_by: employee?.email || null, approved_at: new Date().toISOString(),
      gross_payable_ugx: amount, amount_paid_ugx: amount, advance_recovered_ugx: 0,
      payment_date: form.date, reference: form.reference || null,
      notes: `Recorded payment (no money sent by system)${form.notes ? ` — ${form.notes}` : ''}`,
    });
    setSaving(false);
    if (error) { toast({ title: 'Could not save payment', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Payment recorded', description: `${ugx(amount)} for ${sel.name}` });
    setOpen(false); setForm({ ...form, amount: '', reference: '', notes: '' });
    load(sel);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Supplier accounts</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search supplier by name, code or phone" value={q} onChange={e => setQ(e.target.value)} /></div>
          {error && !sel && <p className="text-sm text-destructive">{error}</p>}
          {q && (
            <div className="max-h-64 overflow-y-auto divide-y rounded border">
              {filtered.map(s => (
                <button key={s.id} className="w-full text-left px-3 py-2 hover:bg-muted text-sm" onClick={() => { setSel(s); setQ(''); load(s); }}>
                  <span className="font-medium">{s.name}</span> <span className="text-muted-foreground">{s.code} · {s.phone}</span>
                </button>
              ))}
              {filtered.length === 0 && <p className="px-3 py-2 text-sm text-muted-foreground">No supplier found.</p>}
            </div>
          )}
        </CardContent>
      </Card>

      {sel && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
            <CardTitle>{sel.name} <span className="text-sm font-normal text-muted-foreground">{sel.code}</span></CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" />Print</Button>
              <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" />Create supplier payment</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading && <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Loading account…</p>}
            {error && <p className="text-sm text-destructive">Could not load this account: {error}</p>}
            {ledger && !loading && !error && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Stat label="Kgs delivered" value={`${ledger.totalKg.toLocaleString()} kg`} />
                  <Stat label="Value of deliveries" value={ugx(ledger.totalValue)} />
                  <Stat label="Total paid" value={ugx(ledger.totalPaid)} />
                  <Stat label={ledger.balance >= 0 ? 'Balance owed to supplier' : 'Supplier overpaid'} value={ugx(Math.abs(ledger.balance))} />
                </div>
                {data.deliveries.some((d: any) => !d.priced) && <p className="text-xs text-muted-foreground">Deliveries not yet priced by Quality count their kgs but no value until priced.</p>}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-muted-foreground border-b">
                      <th className="py-2 pr-2">Date</th><th className="pr-2">Details</th><th className="pr-2 text-right">Kg</th><th className="pr-2 text-right">Value</th><th className="pr-2 text-right">Paid</th><th className="text-right">Balance</th></tr></thead>
                    <tbody>
                      {ledger.lines.map((l, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="py-2 pr-2 whitespace-nowrap">{l.date ? new Date(l.date).toLocaleDateString('en-GB') : '—'}</td>
                          <td className="pr-2">{l.kind === 'payment' ? <Badge variant="outline" className="mr-1">Paid</Badge> : null}{l.description}</td>
                          <td className="pr-2 text-right">{l.kg ? l.kg.toLocaleString() : ''}</td>
                          <td className="pr-2 text-right">{l.value ? l.value.toLocaleString() : ''}</td>
                          <td className="pr-2 text-right">{l.paid ? l.paid.toLocaleString() : ''}</td>
                          <td className="text-right font-medium">{Math.round(l.balance).toLocaleString()}</td>
                        </tr>
                      ))}
                      {ledger.lines.length === 0 && <tr><td colSpan={6} className="py-4 text-center text-muted-foreground">No deliveries or payments yet.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create supplier payment — {sel?.name}</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">This records a payment already made. The system does not send any money.</p>
          <div className="grid gap-3">
            <div><Label>Amount (UGX)</Label><Input type="number" min="1" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
            <div><Label>Payment date</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
            <div><Label>Method</Label>
              <Select value={form.method} onValueChange={v => setForm({ ...form, method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="CASH">Cash</SelectItem><SelectItem value="BANK_TRANSFER">Bank / agent banking</SelectItem><SelectItem value="CHEQUE">Cheque</SelectItem></SelectContent>
              </Select></div>
            <div><Label>Reference (receipt, slip or cheque no.)</Label><Input value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} /></div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Save payment</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="font-semibold">{value}</p></div>
);
