import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getGrnPayCode, formatPayCode } from '@/utils/grnPayCode';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Loader2, CheckCircle2, CreditCard, Printer, ArrowLeft, History, FlaskConical, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import { printGrnPaymentReceipt } from '@/utils/grnPaymentReceipt';
import { useActivityTracker } from '@/hooks/useActivityTracker';
import GRNScannerDialog from '@/components/finance/GRNScannerDialog';
import {
  addToQueue,
  getQueue,
  getScanSessionId,
  markQueuePaid,
  nextPending,
  removeFromQueue,
  subscribeQueue,
  clearQueue,
} from '@/utils/grnQueue';

const normalizeRef = (raw: string) =>
  (raw || '').trim().replace(/^GAC-/i, '').replace(/^GRN-DISC-/i, '').replace(/^GRN-/i, '');

const money = (n?: number | null) => `UGX ${Number(n || 0).toLocaleString()}`;
const dt = (v?: string | null) => (v ? new Date(v).toLocaleString('en-GB') : '—');

export default function GRNScanPay() {
  const { reference = '' } = useParams();
  const navigate = useNavigate();
  const { user, employee } = useAuth();
  const qc = useQueryClient();
  const { trackActivity } = useActivityTracker();
  const rawRef = useMemo(() => normalizeRef(reference), [reference]);

  // The QR now carries a secure random pay code (GAC-K7Q-M4X-T9); older GRNs carried a
  // document verification code or the raw batch number. Resolve whatever we got.
  const { data: resolvedRef, isLoading: resolving } = useQuery({
    queryKey: ['grn-resolve-ref', rawRef],
    enabled: !!rawRef,
    queryFn: async () => {
      if (/^\d{6,16}$/.test(rawRef)) return rawRef;
      const { data, error } = await supabase.rpc('resolve_grn_reference' as any, { p_code: rawRef });
      if (error) return rawRef;
      return (data as string) || '';
    },
  });

  const unresolved = resolvedRef === '';
  const batch = unresolved ? '' : resolvedRef || rawRef;

  // Secure pay code for the resolved GRN, shown so Finance can quote it safely
  const { data: payCode } = useQuery({
    queryKey: ['grn-pay-code', batch],
    enabled: !!batch,
    queryFn: async () => (await getGrnPayCode(batch)) || null,
  });

  const [payOpen, setPayOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [method, setMethod] = useState('CASH');
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [queue, setQueue] = useState(() => getQueue());
  // A batch number can legitimately carry more than one finance lot (historical
  // duplicate batch numbers). Finance must see which lot is already paid and pay the rest.
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null);

  useEffect(() => subscribeQueue(() => setQueue(getQueue())), []);

  // Keep the current GRN in the queue so the list always reflects what Finance is working through
  useEffect(() => {
    if (rawRef) addToQueue(rawRef);
  }, [rawRef]);

  // Stay connected to the paired phone so extra scans keep queueing while paying
  useEffect(() => {
    const sessionId = getScanSessionId();
    const channel = supabase
      .channel(`grn-scan-${sessionId}`, { config: { broadcast: { self: false } } })
      .on('broadcast', { event: 'grn' }, ({ payload }: any) => {
        const ref = payload?.reference;
        if (ref && addToQueue(ref)) toast.success(`${ref} added to the pay queue`);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const openRef = (ref: string) => navigate(`/grn/${encodeURIComponent(ref)}`);
  const goNext = () => {
    const next = nextPending(rawRef);
    if (!next) return toast.info('No more GRNs in the queue');
    openRef(next);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['grn-scan-lot', batch],
    enabled: !!batch && !resolving,
    queryFn: async () => {
      const { data: lots } = await supabase
        .from('finance_coffee_lots')
        .select('*')
        .or(`batch_number.eq.${batch},coffee_record_id.eq.${batch}`)
        .order('created_at', { ascending: true });
      const allLots: any[] = lots || [];

      const { data: recs } = await supabase
        .from('coffee_records')
        .select('*')
        .eq('batch_number', batch);
      const allRecords: any[] = recs || [];

      // Build one payable entry per finance lot so duplicate batch numbers stay separable
      const entries = await Promise.all(
        allLots.map(async (l: any) => {
          const record: any =
            allRecords.find((r) => r.id === l.coffee_record_id) ||
            allRecords.find((r) => r.supplier_name && l.supplier_id && r.supplier_id === l.supplier_id) ||
            (allLots.length === 1 ? allRecords[0] : null);

          let supplierName = record?.supplier_name || null;
          if (!supplierName && l?.supplier_id) {
            const { data: sup } = await supabase.from('suppliers').select('name').eq('id', l.supplier_id).maybeSingle();
            supplierName = (sup as any)?.name || null;
          }

          const { data: pays } = await supabase
            .from('supplier_payments')
            .select('*')
            .eq('lot_id', l.id)
            .order('created_at', { ascending: false });
          const payments: any[] = pays || [];
          const payment: any = payments[0] || null;

          let paidByName: string | null = null;
          const payerRef = payment?.approved_by || payment?.requested_by || null;
          if (payerRef) {
            const { data: emp } = await supabase
              .from('employees')
              .select('name, email, position, department')
              .or(`email.eq.${payerRef},name.eq.${payerRef}`)
              .limit(1)
              .maybeSingle();
            paidByName = (emp as any)?.name
              ? `${(emp as any).name}${(emp as any).position ? ` · ${(emp as any).position}` : ''}`
              : String(payerRef);
          }

          return {
            lot: l,
            record,
            supplierName: supplierName || 'Unknown Supplier',
            payments,
            payment,
            paidByName,
            paid: String(l.finance_status || '').toUpperCase() === 'PAID',
          };
        })
      );

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
        .or(
          [...allLots.map((l: any) => l.id), quality?.id, ...allRecords.map((r: any) => r.id), store?.id]
            .filter(Boolean)
            .map((id) => `record_id.eq.${id}`)
            .join(',') || 'record_id.eq.00000000-0000-0000-0000-000000000000'
        )
        .order('created_at', { ascending: false })
        .limit(50);

      return { entries, record: allRecords[0] || null, quality, store, logs: logs || [] };
    },
  });

  const entries: any[] = data?.entries || [];
  const entry: any =
    entries.find((e) => e.lot?.id === selectedLotId) ||
    entries.find((e) => !e.paid) ||
    entries[0] ||
    null;
  const lot: any = entry?.lot;
  const paid = !!entry?.paid;
  const unpaidCount = entries.filter((e) => !e.paid).length;
  const entryRecord: any = entry?.record || data?.record || null;
  const quality: any = data?.quality;
  const store: any = data?.store;

  // Explains why a scanned GRN has no finance record yet
  const notReady = useMemo(() => {
    const record: any = entryRecord;
    const timestamps: { label: string; at?: string | null }[] = [];
    if (record?.date || record?.created_at) timestamps.push({ label: 'Received at store', at: record?.date || record?.created_at });
    if (quality?.created_at) timestamps.push({ label: 'Assessment submitted', at: quality.created_at });
    if (quality?.qm_reviewed_at) timestamps.push({ label: 'Quality manager review', at: quality.qm_reviewed_at });
    if (quality?.grn_printed_at) timestamps.push({ label: 'GRN printed', at: quality.grn_printed_at });

    const status = String(quality?.status || '').toLowerCase();
    const price = Number(quality?.final_price || quality?.suggested_price || 0);

    if (!record && !quality && !store) {
      return {
        stage: 'Unknown GRN',
        reason: `Nothing in the system matches ${batch}. The QR code may belong to a document from another batch, or the delivery was never recorded in Store.`,
        nextAction: 'Ask Store to confirm the batch number, then re-scan the correct GRN.',
        timestamps,
      };
    }

    if (!quality) {
      return {
        stage: 'Awaiting quality assessment',
        reason: 'The delivery is recorded in Store but Quality has not assessed this batch yet, so no payable amount exists.',
        nextAction: 'Quality personnel must assess and submit this batch.',
        timestamps,
      };
    }

    if (status === 'rejected' || quality?.qm_action === 'rejected') {
      return {
        stage: 'Rejected by Quality',
        reason: `This batch was rejected${quality?.qm_notes ? ` — ${quality.qm_notes}` : ''}. Rejected lots only reach Finance if the Administrator approves a discretion buy.`,
        nextAction: 'Administrator to review under Rejected Lots (discretion buy) or return the coffee to the supplier.',
        timestamps,
      };
    }

    if (status === 'pending_quality_manager' || (status === 'assessed' && !quality?.qm_reviewed_at)) {
      return {
        stage: 'Pending Quality Manager approval',
        reason: `Submitted by ${quality?.assessed_by || quality?.physical_assessment_by || 'quality personnel'} and waiting for the Quality Manager to approve. Finance only receives approved lots.`,
        nextAction: 'Quality Manager to approve this assessment in Quality → Approvals.',
        timestamps,
      };
    }

    if (price <= 0) {
      return {
        stage: 'No price set',
        reason: 'The assessment has no final or suggested price, so a payable amount cannot be created.',
        nextAction: 'Quality Manager to set the final price on this assessment.',
        timestamps,
      };
    }

    return {
      stage: 'Approved but not yet released',
      reason: 'Quality approved this batch, but the finance lot has not been created yet. This is usually a short delay in the release step.',
      nextAction: 'Refresh in a moment; if it persists, ask the Quality Manager to re-save the approval so it migrates to Finance.',
      timestamps,
    };
  }, [data, quality, store, batch]);

  const trail = useMemo(() => {
    const items: { at?: string | null; title: string; detail?: string }[] = [];
    if (entryRecord?.created_at) items.push({ at: entryRecord.created_at, title: 'Coffee received (Store)', detail: `${Number(entryRecord.kilograms || 0).toLocaleString()} kg ${entryRecord.coffee_type || ''} from ${entry?.supplierName || '—'}` });
    if (store?.created_at) items.push({ at: store.created_at, title: `Store record ${store.transaction_type || ''}`.trim(), detail: `${Number(store.quantity_kg || 0).toLocaleString()} kg · ${store.status || ''}` });
    if (quality?.created_at) items.push({ at: quality.created_at, title: 'Quality assessment submitted', detail: `By ${quality.assessed_by || quality.physical_assessment_by || '—'} · Ref ${quality.assessment_ref || '—'}` });
    if (quality?.qm_reviewed_at) items.push({ at: quality.qm_reviewed_at, title: `Quality manager ${quality.qm_action || 'review'}`, detail: `${quality.qm_reviewed_by || '—'}${quality.qm_notes ? ` · ${quality.qm_notes}` : ''}` });
    if (quality?.grn_printed_at) items.push({ at: quality.grn_printed_at, title: `GRN printed (${quality.form_number || '—'})`, detail: quality.grn_printed_by || '' });
    if (lot?.created_at) items.push({ at: lot.created_at, title: 'Released to Finance', detail: `${money(lot.total_amount_ugx)} payable` });
    (entry?.payments || []).forEach((p: any) => items.push({ at: p.created_at, title: `Payment ${p.status || 'recorded'} · ${p.method || ''}`, detail: `${money(p.amount_paid_ugx)} by ${p.requested_by || '—'}` }));
    (data?.logs || []).forEach((l: any) => items.push({ at: l.created_at, title: l.action, detail: `${l.performed_by || '—'}${l.reason ? ` · ${l.reason}` : ''}` }));
    return items.sort((a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime());
  }, [data, entry, entryRecord, lot, quality, store]);

  const receipt = () => {

    if (!lot) return;
    const lotValue = Number(lot.total_amount_ugx || 0);
    const thisPayment = Number(entry?.payment?.amount_paid_ugx ?? lot.total_amount_ugx ?? 0);
    const previouslyPaid = (entry?.payments || [])
      .filter((p: any) =>
        p.id !== entry?.payment?.id &&
        !['failed', 'cancelled', 'rejected'].includes(String(p.status || '').toLowerCase()))
      .reduce((s: number, p: any) => s + Number(p.amount_paid_ugx || 0), 0);
    trackActivity('report_generation', `printing supplier payment receipt for ${lot.batch_number || batch}`, {
      form_name: 'GRN Payment Receipt',
      batch: lot.batch_number || batch,
    });
    printGrnPaymentReceipt({
      grnNumber: `GRN-${lot.batch_number || batch}`,
      supplierName: entry?.supplierName || 'Unknown Supplier',
      coffeeType: entryRecord?.coffee_type,
      quantityKg: lot.quantity_kg,
      unitPrice: lot.unit_price_ugx,
      amount: thisPayment,
      lotValue,
      previouslyPaid,
      balance: Math.max(lotValue - previouslyPaid - thisPayment, 0),
      method: entry?.payment?.method || method,
      paidAt: entry?.payment?.created_at || lot.updated_at || new Date().toISOString(),
      paidBy: entry?.paidByName || entry?.payment?.requested_by || 'Finance Department',
      printedBy: employee?.name
        ? `${employee.name}${(employee as any)?.position ? ` · ${(employee as any).position}` : ''}`
        : (user?.email || 'Finance Department'),
      notes: entry?.payment?.notes || lot.finance_notes,
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
          description: `Supplier payment (QR): ${entry?.supplierName} - ${lot.batch_number || batch}`,
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
        reason: `Paid ${entry?.supplierName} ${money(lot.total_amount_ugx)} via ${method} (GRN QR scan)`,
        record_data: { batch: lot.batch_number || batch, amount: lot.total_amount_ugx, method },
      });

      toast.success(`Payment of ${money(lot.total_amount_ugx)} recorded`);
      trackActivity('transaction', `paying supplier for GRN ${lot.batch_number || batch}`, {
        form_name: 'GRN Scan Payment',
        batch: lot.batch_number || batch,
        amount: lot.total_amount_ugx,
        method,
      });
      setPayOpen(false);
      const remaining = entries.filter((e) => !e.paid && e.lot?.id !== lot.id);
      if (remaining.length === 0) {
        markQueuePaid(rawRef);
        if (batch !== rawRef) markQueuePaid(batch);
      } else {
        setSelectedLotId(remaining[0].lot.id);
        toast.info(`${remaining.length} more unpaid lot(s) share batch ${batch} — pay them next`);
      }
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

  if (unresolved) {
    return (
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/v2/finance')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Finance
        </Button>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-destructive">Unknown pay code</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              <span className="font-mono">{rawRef}</span> is not a valid GRN pay code. Nothing was opened, so no
              payment can go to the wrong supplier. Re-scan the QR on the printed GRN, or type the pay code exactly
              as printed under it.
            </p>
            <Button variant="outline" size="sm" className="w-full" onClick={() => setScanOpen(true)}>
              <QrCode className="h-4 w-4 mr-2" /> Scan GRN
            </Button>
          </CardContent>
        </Card>
        <GRNScannerDialog open={scanOpen} onOpenChange={setScanOpen} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/v2/finance')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Finance
        </Button>
        <Button variant="outline" size="sm" onClick={() => setScanOpen(true)}>
          <QrCode className="h-4 w-4 mr-1" /> Scan other
        </Button>
      </div>

      {queue.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm">
                Pay queue · {queue.filter((q) => !q.paid).length} pending of {queue.length}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => clearQueue()}>Clear</Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-1.5">
              {queue.map((q) => {
                const current = q.ref.toUpperCase() === rawRef.toUpperCase();
                return (
                  <div
                    key={q.ref}
                    className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${
                      current ? 'border-primary bg-primary/10' : q.paid ? 'opacity-60' : ''
                    }`}
                  >
                    <button className="hover:underline" onClick={() => openRef(q.ref)}>
                      {q.ref}
                    </button>
                    {q.paid && (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-green-700">
                        <CheckCircle2 className="h-3 w-3" /> PAID
                      </span>
                    )}
                    <button
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => removeFromQueue(q.ref)}
                      aria-label={`Remove ${q.ref} from queue`}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
             <div>
               <CardTitle className="text-lg">GRN-{lot?.batch_number || batch}</CardTitle>
               {payCode && (
                 <p className="text-xs text-muted-foreground font-mono mt-1">Pay code: {formatPayCode(payCode)}</p>
               )}
             </div>
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
                <div><span className="text-muted-foreground block">Supplier</span>{entry?.supplierName || '—'}</div>
                {notReady.timestamps.map((t) => (
                  <div key={t.label}><span className="text-muted-foreground block">{t.label}</span>{dt(t.at)}</div>
                ))}
              </div>
              <Button variant="outline" size="sm" className="w-full" onClick={() => setScanOpen(true)}>
                <QrCode className="h-4 w-4 mr-2" /> Scan other GRN
              </Button>
            </div>
          ) : (
            <>
              {paid && (
                <div className="rounded-md border-2 border-green-500 bg-green-50 dark:bg-green-950/20 p-3 space-y-1">
                  <p className="text-sm font-bold text-green-800 dark:text-green-300 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" /> ALREADY PAID — no further payment needed
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-muted-foreground block">Amount paid</span>{money(entry?.payment?.amount_paid_ugx ?? lot.total_amount_ugx)}</div>
                    <div><span className="text-muted-foreground block">Method</span>{entry?.payment?.method || '—'}</div>
                    <div><span className="text-muted-foreground block">Paid on</span>{dt(entry?.payment?.created_at)}</div>
                    <div><span className="text-muted-foreground block">Paid by</span>{entry?.paidByName || entry?.payment?.requested_by || '—'}<span className="block text-[10px] text-muted-foreground">on behalf of Finance</span></div>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground block">Supplier</span>{entry?.supplierName}</div>
                <div><span className="text-muted-foreground block">Coffee type</span>{entryRecord?.coffee_type || '—'}</div>
                <div><span className="text-muted-foreground block">Quantity</span>{Number(lot.quantity_kg || 0).toLocaleString()} kg</div>
                <div><span className="text-muted-foreground block">Unit price</span>{money(lot.unit_price_ugx)}</div>
                <div><span className="text-muted-foreground block">Bags</span>{entryRecord?.bags ?? store?.quantity_bags ?? '—'}</div>
                <div><span className="text-muted-foreground block">Received on</span>{dt(entryRecord?.date || entryRecord?.created_at)}</div>
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
                    {entry?.payment?.created_at ? ` on ${new Date(entry.payment.created_at).toLocaleString('en-GB')}` : ''}
                  </div>
                  <Button onClick={receipt} className="w-full">
                    <Printer className="h-4 w-4 mr-2" /> Print payment receipt
                  </Button>
                  {nextPending(rawRef) && (
                    <Button onClick={goNext} className="w-full">
                      Next GRN in queue ({queue.filter((q) => !q.paid).length} left)
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => setScanOpen(true)} className="w-full">
                    <QrCode className="h-4 w-4 mr-2" /> Scan other
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
              {entry?.supplierName} — {money(lot?.total_amount_ugx)} for GRN-{lot?.batch_number || batch}
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

      <GRNScannerDialog open={scanOpen} onOpenChange={setScanOpen} />
    </div>
  );
}
