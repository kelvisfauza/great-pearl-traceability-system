import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Loader2, CheckCircle2, CreditCard, Printer, ArrowLeft, History, FlaskConical } from 'lucide-react';
import { toast } from 'sonner';
import { printGrnPaymentReceipt } from '@/utils/grnPaymentReceipt';

const normalizeRef = (raw: string) =>
  (raw || '').trim().replace(/^GAC-/i, '').replace(/^GRN-DISC-/i, '').replace(/^GRN-/i, '');

const money = (n?: number | null) => `UGX ${Number(n || 0).toLocaleString()}`;
const dt = (v?: string | null) => (v ? new Date(v).toLocaleString('en-GB') : '—');

export default function GRNScanPay() {
  const { reference = '' } = useParams();
  const navigate = useNavigate();
  const { user, employee } = useAuth();
  const qc = useQueryClient();
  const rawRef = useMemo(() => normalizeRef(reference), [reference]);

  // Older GRNs encoded a document verification code (GPCF-DOC-YYYY-XXXXXX) in the QR.
  // Resolve it back to the real batch number before looking up finance records.
  const { data: resolvedRef, isLoading: resolving } = useQuery({
    queryKey: ['grn-resolve-ref', rawRef],
    enabled: !!rawRef,
    queryFn: async () => {
      if (!/^GPCF-[A-Z]{2,3}-\d{4}-[A-Z0-9]{4,10}$/i.test(rawRef)) return rawRef;
      const { data, error } = await supabase.rpc('resolve_grn_reference' as any, { p_code: rawRef });
      if (error) return rawRef;
      return (data as string) || rawRef;
    },
  });

  const batch = resolvedRef || rawRef;

  const [payOpen, setPayOpen] = useState(false);
  const [method, setMethod] = useState('CASH');
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['grn-scan-lot', batch],
    enabled: !!batch && !resolving,
    queryFn: async () => {
      const { data: lots } = await supabase
        .from('finance_coffee_lots')
        .select('*')
        .or(`batch_number.eq.${batch},coffee_record_id.eq.${batch}`)
        .order('created_at', { ascending: false })
        .limit(1);
      const lot: any = lots?.[0] || null;

      const { data: recs } = await supabase
        .from('coffee_records')
        .select('*')
        .eq('batch_number', batch)
        .limit(1);
      const record: any = recs?.[0] || null;

      let supplierName = record?.supplier_name || null;
      if (!supplierName && lot?.supplier_id) {
        const { data: sup } = await supabase.from('suppliers').select('name').eq('id', lot.supplier_id).maybeSingle();
        supplierName = (sup as any)?.name || null;
      }

      let payment: any = null;
      let payments: any[] = [];
      if (lot?.id) {
        const { data: pays } = await supabase
          .from('supplier_payments')
          .select('*')
          .eq('lot_id', lot.id)
          .order('created_at', { ascending: false });
        payments = pays || [];
        payment = payments[0] || null;
      }

      const { data: qas } = await supabase
        .from('quality_assessments')
        .select('*')
        .eq('batch_number', batch)
        .order('created_at', { ascending: false })
        .limit(1);
      const quality: any = qas?.[0] || null;

      const { data: stores } = await supabase
        .from('store_records')
        .select('*')
        .eq('batch_number', batch)
        .order('created_at', { ascending: false })
        .limit(1);
      const store: any = stores?.[0] || null;

      const { data: logs } = await supabase
        .from('audit_logs')
        .select('*')
        .or([lot?.id, quality?.id, record?.id, store?.id].filter(Boolean).map((id) => `record_id.eq.${id}`).join(',') || 'record_id.eq.00000000-0000-0000-0000-000000000000')
        .order('created_at', { ascending: false })
        .limit(50);

      return { lot, record, supplierName: supplierName || 'Unknown Supplier', payment, payments, quality, store, logs: logs || [] };
    },
  });

  const lot: any = data?.lot;
  const paid = lot?.finance_status === 'PAID';
  const quality: any = data?.quality;
  const store: any = data?.store;

  const trail = useMemo(() => {
    const items: { at?: string | null; title: string; detail?: string }[] = [];
    if (data?.record?.created_at) items.push({ at: data.record.created_at, title: 'Coffee received (Store)', detail: `${Number(data.record.kilograms || 0).toLocaleString()} kg ${data.record.coffee_type || ''} from ${data.supplierName}` });
    if (store?.created_at) items.push({ at: store.created_at, title: `Store record ${store.transaction_type || ''}`.trim(), detail: `${Number(store.quantity_kg || 0).toLocaleString()} kg · ${store.status || ''}` });
    if (quality?.created_at) items.push({ at: quality.created_at, title: 'Quality assessment submitted', detail: `By ${quality.assessed_by || quality.physical_assessment_by || '—'} · Ref ${quality.assessment_ref || '—'}` });
    if (quality?.qm_reviewed_at) items.push({ at: quality.qm_reviewed_at, title: `Quality manager ${quality.qm_action || 'review'}`, detail: `${quality.qm_reviewed_by || '—'}${quality.qm_notes ? ` · ${quality.qm_notes}` : ''}` });
    if (quality?.grn_printed_at) items.push({ at: quality.grn_printed_at, title: `GRN printed (${quality.form_number || '—'})`, detail: quality.grn_printed_by || '' });
    if (lot?.created_at) items.push({ at: lot.created_at, title: 'Released to Finance', detail: `${money(lot.total_amount_ugx)} payable` });
    (data?.payments || []).forEach((p: any) => items.push({ at: p.created_at, title: `Payment ${p.status || 'recorded'} · ${p.method || ''}`, detail: `${money(p.amount_paid_ugx)} by ${p.requested_by || '—'}` }));
    (data?.logs || []).forEach((l: any) => items.push({ at: l.created_at, title: l.action, detail: `${l.performed_by || '—'}${l.reason ? ` · ${l.reason}` : ''}` }));
    return items.sort((a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime());
  }, [data]);

  const receipt = () => {

    if (!lot) return;
    printGrnPaymentReceipt({
      grnNumber: `GRN-${lot.batch_number || batch}`,
      supplierName: data?.supplierName || 'Unknown Supplier',
      coffeeType: data?.record?.coffee_type,
      quantityKg: lot.quantity_kg,
      unitPrice: lot.unit_price_ugx,
      amount: lot.total_amount_ugx,
      method: data?.payment?.method || method,
      paidAt: data?.payment?.created_at || lot.updated_at || new Date().toISOString(),
      paidBy: data?.payment?.requested_by || 'Finance Department',
      notes: data?.payment?.notes || lot.finance_notes,
      receiptNo: `RCP-${String(lot.batch_number || batch).replace(/[^A-Z0-9]/gi, '').slice(-8)}`,
    });
  };

  const handlePay = async () => {
    if (!lot) return;
    setProcessing(true);
    try {
      const payer = employee?.name || user?.email || 'Finance Department';

      const { error: updErr } = await supabase
        .from('finance_coffee_lots')
        .update({
          finance_status: 'PAID' as any,
          finance_notes: notes || `Paid via ${method} (QR scan)`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', lot.id);
      if (updErr) throw updErr;

      const { error: payErr } = await supabase.from('supplier_payments').insert({
        supplier_id: lot.supplier_id,
        lot_id: lot.id,
        amount_paid_ugx: lot.total_amount_ugx,
        gross_payable_ugx: lot.total_amount_ugx,
        method: method as any,
        notes: notes || `Paid via QR scan of ${lot.batch_number || batch}`,
        requested_by: payer,
      });
      if (payErr) throw payErr;

      const { data: balance } = await supabase.from('finance_cash_balance').select('*').maybeSingle();
      if (balance) {
        const before = (balance as any).current_balance || 0;
        await (supabase as any)
          .from('finance_cash_balance')
          .update({ current_balance: before - lot.total_amount_ugx, updated_at: new Date().toISOString() })
          .eq('id', (balance as any).id);
        await (supabase as any).from('finance_cash_transactions').insert({
          transaction_type: 'outbound',
          amount: lot.total_amount_ugx,
          description: `Supplier payment (QR): ${data?.supplierName} - ${lot.batch_number || batch}`,
          reference_number: lot.batch_number || batch,
          performed_by: payer,
          balance_before: before,
          balance_after: before - lot.total_amount_ugx,
        });
      }

      await supabase.from('audit_logs').insert({
        action: 'SUPPLIER_PAYMENT_QR',
        table_name: 'finance_coffee_lots',
        record_id: lot.id,
        performed_by: payer,
        department: 'Finance',
        reason: `Paid ${data?.supplierName} ${money(lot.total_amount_ugx)} via ${method} (GRN QR scan)`,
        record_data: { batch: lot.batch_number || batch, amount: lot.total_amount_ugx, method },
      });

      toast.success(`Payment of ${money(lot.total_amount_ugx)} recorded`);
      setPayOpen(false);
      await qc.invalidateQueries({ queryKey: ['grn-scan-lot', batch] });
      qc.invalidateQueries({ queryKey: ['finance-pending-payments'] });
      setTimeout(receipt, 300);
    } catch (e: any) {
      toast.error('Payment failed: ' + (e.message || 'Unknown error'));
    } finally {
      setProcessing(false);
    }
  };

  if (isLoading || resolving) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate('/v2/finance')}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Finance
      </Button>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-lg">GRN-{lot?.batch_number || batch}</CardTitle>
            {lot && (
              <Badge variant={paid ? 'default' : 'secondary'}>
                {paid ? 'PAID' : lot.finance_status}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {!lot ? (
            <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/20 p-3 space-y-2">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                Not ready for Finance — {notReady.stage}
              </p>
              <p className="text-sm text-muted-foreground">{notReady.reason}</p>
              <p className="text-sm">
                <span className="text-muted-foreground">Next action: </span>
                <span className="font-medium">{notReady.nextAction}</span>
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t">
                <div><span className="text-muted-foreground block">GRN / Batch</span>{batch}</div>
                <div><span className="text-muted-foreground block">Supplier</span>{data?.supplierName || '—'}</div>
                {notReady.timestamps.map((t) => (
                  <div key={t.label}><span className="text-muted-foreground block">{t.label}</span>{dt(t.at)}</div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground block">Supplier</span>{data?.supplierName}</div>
                <div><span className="text-muted-foreground block">Coffee type</span>{data?.record?.coffee_type || '—'}</div>
                <div><span className="text-muted-foreground block">Quantity</span>{Number(lot.quantity_kg || 0).toLocaleString()} kg</div>
                <div><span className="text-muted-foreground block">Unit price</span>{money(lot.unit_price_ugx)}</div>
                <div><span className="text-muted-foreground block">Bags</span>{data?.record?.bags ?? store?.quantity_bags ?? '—'}</div>
                <div><span className="text-muted-foreground block">Received on</span>{dt(data?.record?.date || data?.record?.created_at)}</div>
                <div><span className="text-muted-foreground block">GRN / Form no.</span>{lot.grn_number || quality?.form_number || `GRN-${lot.batch_number || batch}`}</div>
                <div><span className="text-muted-foreground block">Store location</span>{store?.to_location || store?.from_location || '—'}</div>
                <div className="col-span-2 text-base font-semibold">
                  <span className="text-muted-foreground block text-xs font-normal">Total payable</span>
                  {money(lot.total_amount_ugx)}
                </div>
                <div><span className="text-muted-foreground block">Advance recovered</span>{money(lot.advance_recovered_ugx)}</div>
                <div><span className="text-muted-foreground block">Balance</span>{money(lot.balance_ugx ?? lot.total_amount_ugx)}</div>
              </div>

              {quality && (
                <div className="rounded-md border p-3 space-y-2">
                  <p className="text-sm font-medium flex items-center gap-2"><FlaskConical className="h-4 w-4" /> Quality analysis</p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div><span className="text-muted-foreground block">Moisture</span>{quality.moisture ?? '—'}%</div>
                    <div><span className="text-muted-foreground block">Outturn</span>{quality.outturn ?? '—'}</div>
                    <div><span className="text-muted-foreground block">FM</span>{quality.fm ?? '—'}</div>
                    <div><span className="text-muted-foreground block">Group 1</span>{quality.group1_defects ?? '—'}</div>
                    <div><span className="text-muted-foreground block">Group 2</span>{quality.group2_defects ?? '—'}</div>
                    <div><span className="text-muted-foreground block">Below 12</span>{quality.below12 ?? '—'}</div>
                    <div><span className="text-muted-foreground block">Husks</span>{quality.husks ?? '—'}</div>
                    <div><span className="text-muted-foreground block">Stones</span>{quality.stones ?? '—'}</div>
                    <div><span className="text-muted-foreground block">Pods</span>{quality.pods ?? '—'}</div>
                    <div><span className="text-muted-foreground block">Suggested</span>{money(quality.suggested_price)}</div>
                    <div><span className="text-muted-foreground block">Final price</span>{money(quality.final_price)}</div>
                    <div><span className="text-muted-foreground block">Status</span>{quality.status || '—'}</div>
                  </div>
                  {quality.comments && <p className="text-xs text-muted-foreground">Note: {quality.comments}</p>}
                </div>
              )}

              {paid ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-green-700">
                    <CheckCircle2 className="h-4 w-4" /> Paid
                    {data?.payment?.created_at ? ` on ${new Date(data.payment.created_at).toLocaleString('en-GB')}` : ''}
                  </div>
                  <Button onClick={receipt} className="w-full">
                    <Printer className="h-4 w-4 mr-2" /> Print payment receipt
                  </Button>
                </div>
              ) : (
                <Button onClick={() => setPayOpen(true)} className="w-full">
                  <CreditCard className="h-4 w-4 mr-2" /> Pay this GRN
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {lot && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><History className="h-4 w-4" /> Audit trail</CardTitle>
          </CardHeader>
          <CardContent>
            {trail.length === 0 ? (
              <p className="text-sm text-muted-foreground">No trail entries recorded for this GRN.</p>
            ) : (
              <ol className="space-y-3">
                {trail.map((t, i) => (
                  <li key={i} className="relative pl-5 text-sm">
                    <span className="absolute left-0 top-1.5 h-2 w-2 rounded-full bg-primary" />
                    <div className="font-medium">{t.title}</div>
                    {t.detail && <div className="text-xs text-muted-foreground">{t.detail}</div>}
                    <div className="text-[11px] text-muted-foreground">{dt(t.at)}</div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm payment</DialogTitle>
            <DialogDescription>
              {data?.supplierName} — {money(lot?.total_amount_ugx)} for GRN-{lot?.batch_number || batch}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="BANK">Bank transfer</SelectItem>
                <SelectItem value="MOBILE_MONEY">Mobile money</SelectItem>
              </SelectContent>
            </Select>
            <Textarea placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(false)} disabled={processing}>Cancel</Button>
            <Button onClick={handlePay} disabled={processing}>
              {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Confirm &amp; pay
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
