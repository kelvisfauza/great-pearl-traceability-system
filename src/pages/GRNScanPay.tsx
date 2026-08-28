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
import { Loader2, CheckCircle2, CreditCard, Printer, ArrowLeft, History, FlaskConical, QrCode, Send } from 'lucide-react';
import { toast } from 'sonner';
import { printGrnPaymentReceipt } from '@/utils/grnPaymentReceipt';
import { useActivityTracker } from '@/hooks/useActivityTracker';
import GRNScannerDialog from '@/components/finance/GRNScannerDialog';
import {
  useCanReleasePayments,
  useFinancePayers,
  useGrnReferrals,
  completeGrnReferral,
} from '@/hooks/useGrnReferrals';

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

  // Scan-only finance staff (Finance:view + Finance:create) cannot release money —
  // they submit the scanned GRN to an approver who pays and prints the receipt.
  const canPay = useCanReleasePayments();
  const { data: payers, isLoading: payersLoading, error: payersError } = useFinancePayers();
  const { referrals, allReferrals, assignedToMe, createReferral, refetch: refetchReferrals } = useGrnReferrals();
  const [openingReferral, setOpeningReferral] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [payerEmail, setPayerEmail] = useState('');
  const [referralNotes, setReferralNotes] = useState('');


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

  // Next pending referral assigned to me (so finance never has to go back to the referrals list)
  const nextReferral = useMemo(() => {
    const current = String(batch || rawRef || '').toLowerCase();
    return (
      assignedToMe.find(
        (r) => String(r.batch_number).toLowerCase() !== current,
      ) || null
    );
  }, [assignedToMe, batch, rawRef]);

  const goNextReferral = async () => {
    if (!nextReferral) return toast.info('No more referrals assigned to you');
    setOpeningReferral(true);
    try {
      await refetchReferrals();
      const code =
        nextReferral.pay_code ||
        (await getGrnPayCode(nextReferral.batch_number).catch(() => null));
      openRef(code || nextReferral.batch_number);
    } finally {
      setOpeningReferral(false);
    }
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

    if ((status === 'rejected' || quality?.qm_action === 'rejected') && !quality?.admin_discretion_buy) {
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
      inputBy: grnReferral
        ? (grnReferral.referred_by_name || grnReferral.referred_by_email)
        : null,
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
      // Close any referral on this GRN and reward both the scanner and the payer
      const rewards = await completeGrnReferral(lot.batch_number || batch, lot.id);
      if (rewards?.ok) {
        toast.success('Referral closed — scanner and payer rewarded');
        refetchReferrals();
      }
      await qc.invalidateQueries({ queryKey: ['grn-scan-lot', batch] });
      qc.invalidateQueries({ queryKey: ['finance-pending-payments'] });
      qc.invalidateQueries({ queryKey: ['grn-referrals'] });
      setTimeout(receipt, 300);
    } catch (e: any) {
      toast.error('Payment failed: ' + (e.message || 'Unknown error'));
    } finally {
      setProcessing(false);
    }
  };

  // Referral already raised by this user for the GRN on screen
  const myReferral = useMemo(
    () =>
      referrals.find(
        (r) =>
          r.status === 'pending' &&
          normalizeRef(r.batch_number) === normalizeRef(lot?.batch_number || batch),
      ) || null,
    [referrals, lot, batch],
  );

  // Any referral (pending or completed) for this GRN — used as "Input by" on receipts
  const grnReferral = useMemo(
    () =>
      referrals.find(
        (r) => normalizeRef(r.batch_number) === normalizeRef(lot?.batch_number || batch),
      ) || null,
    [referrals, lot, batch],
  );

  const handleSubmitForPayment = async () => {
    if (!lot || !payerEmail) return;
    setSubmitting(true);
    try {
      const payer = (payers || []).find((p) => p.email === payerEmail);
      await createReferral({
        batch_number: lot.batch_number || batch,
        lot_id: lot.id,
        pay_code: payCode || null,
        supplier_name: entry?.supplierName || null,
        coffee_type: entryRecord?.coffee_type || null,
        quantity_kg: lot.quantity_kg ?? null,
        amount_ugx: Number(lot.total_amount_ugx || 0),
        assigned_to_email: payerEmail,
        assigned_to_name: payer?.name || null,
        notes: referralNotes || null,
      });
      trackActivity('form_submission', `submitting GRN ${lot.batch_number || batch} for payment`, {
        form_name: 'GRN Payment Referral',
        batch: lot.batch_number || batch,
        amount: lot.total_amount_ugx,
      });
      toast.success(`GRN submitted to ${payer?.name || payerEmail} for payment`);
      setSubmitOpen(false);
      setReferralNotes('');
      refetchReferrals();
    } catch (e: any) {
      toast.error('Submit failed: ' + (e.message || 'Unknown error'));
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Bulk submit: send every queued GRN to one finance approver in one go ----
  const queuedRefs = useMemo(() => queue.filter((q) => !q.paid).map((q) => q.ref), [queue]);

  const alreadySubmitted = (ref: string) =>
    referrals.some((r) => r.status === 'pending' && normalizeRef(r.batch_number) === normalizeRef(ref));

  const pendingBulkRefs = useMemo(
    () => queuedRefs.filter((r) => !alreadySubmitted(r)),
    [queuedRefs, referrals],
  );

  const resolveQueuedGrn = async (ref: string) => {
    const raw = normalizeRef(ref);
    let resolved = raw;
    if (!/^\d{6,16}$/.test(raw)) {
      const { data } = await supabase.rpc('resolve_grn_reference' as any, { p_code: raw });
      resolved = (data as string) || '';
    }
    if (!resolved) return { error: 'Unknown pay code' } as const;

    const { data: lots } = await supabase
      .from('finance_coffee_lots')
      .select('*')
      .or(`batch_number.eq.${resolved},coffee_record_id.eq.${resolved}`)
      .order('created_at', { ascending: true });

    const unpaid = (lots || []).filter(
      (l: any) => String(l.finance_status || '').toUpperCase() !== 'PAID',
    );
    if (unpaid.length === 0) {
      return { error: (lots || []).length ? 'Already paid' : 'Not ready for payment' } as const;
    }

    const { data: recs } = await supabase
      .from('coffee_records')
      .select('supplier_name, coffee_type, supplier_id, id')
      .eq('batch_number', resolved);

    const code = await getGrnPayCode(resolved).catch(() => null);

    return { resolved, lots: unpaid, records: (recs || []) as any[], payCode: code } as const;
  };

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkResults, setBulkResults] = useState<{ ref: string; ok: boolean; message: string }[]>([]);

  const handleBulkSubmit = async () => {
    if (!payerEmail || pendingBulkRefs.length === 0) return;
    const payer = (payers || []).find((p) => p.email === payerEmail);
    setBulkRunning(true);
    setBulkResults([]);
    const results: { ref: string; ok: boolean; message: string }[] = [];

    for (const ref of pendingBulkRefs) {
      try {
        const resolvedGrn = await resolveQueuedGrn(ref);
        if ('error' in resolvedGrn) {
          results.push({ ref, ok: false, message: resolvedGrn.error });
          setBulkResults([...results]);
          continue;
        }

        for (const l of resolvedGrn.lots) {
          const record =
            resolvedGrn.records.find((r) => r.id === l.coffee_record_id) ||
            resolvedGrn.records.find((r) => r.supplier_id && r.supplier_id === l.supplier_id) ||
            resolvedGrn.records[0] ||
            null;

          await createReferral({
            batch_number: l.batch_number || resolvedGrn.resolved,
            lot_id: l.id,
            pay_code: resolvedGrn.payCode || null,
            supplier_name: record?.supplier_name || null,
            coffee_type: record?.coffee_type || null,
            quantity_kg: l.quantity_kg ?? null,
            amount_ugx: Number(l.total_amount_ugx || 0),
            assigned_to_email: payerEmail,
            assigned_to_name: payer?.name || null,
            notes: referralNotes || null,
          });
        }

        results.push({
          ref,
          ok: true,
          message: `${resolvedGrn.lots.length} lot${resolvedGrn.lots.length > 1 ? 's' : ''} submitted`,
        });
        setBulkResults([...results]);
      } catch (e: any) {
        results.push({ ref, ok: false, message: e.message || 'Submit failed' });
        setBulkResults([...results]);
      }
    }

    const sent = results.filter((r) => r.ok).length;
    if (sent > 0) {
      trackActivity('form_submission', `submitting ${sent} GRNs for payment in bulk`, {
        form_name: 'GRN Payment Referral (bulk)',
        count: sent,
      });
      toast.success(`${sent} GRN${sent > 1 ? 's' : ''} submitted to ${payer?.name || payerEmail}`);
    }
    const failed = results.length - sent;
    if (failed > 0) toast.error(`${failed} GRN${failed > 1 ? 's' : ''} could not be submitted`);

    setBulkRunning(false);
    setReferralNotes('');
    refetchReferrals();
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
                const sent = alreadySubmitted(q.ref);
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
                    {!q.paid && sent && (
                      <span className="text-[10px] font-semibold text-blue-700">SUBMITTED</span>
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

            {!canPay && (
              <div className="mt-3 space-y-2 border-t pt-3">
                <p className="text-xs text-muted-foreground">
                  Scan as many GRNs as you need, then send the whole queue to one finance approver in a single step.
                </p>
                <Button
                  size="sm"
                  className="w-full"
                  disabled={pendingBulkRefs.length === 0}
                  onClick={() => {
                    setBulkResults([]);
                    setBulkOpen(true);
                  }}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {pendingBulkRefs.length === 0
                    ? 'All queued GRNs submitted'
                    : `Submit ${pendingBulkRefs.length} queued GRN${pendingBulkRefs.length > 1 ? 's' : ''} for payment`}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}


      {entries.length > 1 && (
        <Card className="border-amber-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              Batch {batch} has {entries.length} lots · {unpaidCount} still unpaid
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            <p className="text-xs text-muted-foreground">
              This batch number is shared by more than one delivery. Paying one lot does not pay the others — select
              each unpaid lot below and pay it separately.
            </p>
            {entries.map((e: any) => {
              const active = e.lot?.id === lot?.id;
              return (
                <button
                  key={e.lot.id}
                  onClick={() => setSelectedLotId(e.lot.id)}
                  className={`w-full text-left rounded-md border p-2 text-xs transition ${
                    active ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                  } ${e.paid ? 'opacity-70' : ''}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">
                      {e.supplierName}
                      {e.record?.coffee_type ? ` · ${e.record.coffee_type}` : ''}
                    </span>
                    <Badge variant={e.paid ? 'default' : 'secondary'} className={e.paid ? 'bg-green-600' : ''}>
                      {e.paid ? 'PAID' : 'UNPAID'}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground mt-0.5">
                    {Number(e.lot.quantity_kg || 0).toLocaleString()} kg · {money(e.lot.total_amount_ugx)}
                    {e.paid && e.payment?.created_at ? ` · paid ${dt(e.payment.created_at)}` : ''}
                  </div>
                </button>
              );
            })}
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
                  {canPay && nextReferral && (
                    <Button
                      onClick={goNextReferral}
                      disabled={openingReferral}
                      className="w-full"
                      variant="secondary"
                    >
                      {openingReferral ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CreditCard className="h-4 w-4 mr-2" />
                      )}
                      Pay next referral · GRN-{nextReferral.batch_number} ({assignedToMe.length} left)
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => setScanOpen(true)} className="w-full">
                    <QrCode className="h-4 w-4 mr-2" /> Scan other
                  </Button>
                </div>
              ) : canPay ? (
                <Button onClick={() => setPayOpen(true)} className="w-full">
                  <CreditCard className="h-4 w-4 mr-2" /> Pay this GRN
                </Button>
              ) : (
                <div className="space-y-2">
                  {myReferral ? (
                    <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
                      Submitted for payment to{' '}
                      <span className="font-medium">{myReferral.assigned_to_name || myReferral.assigned_to_email}</span>{' '}
                      on {dt(myReferral.created_at)}. Waiting for them to release the money.
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      You can scan and verify GRNs but not release money. Submit this GRN to a finance approver for
                      payment and receipt printing.
                    </p>
                  )}
                  <Button onClick={() => setSubmitOpen(true)} className="w-full" disabled={!!myReferral}>
                    <Send className="h-4 w-4 mr-2" />
                    {myReferral ? 'Already submitted' : 'Submit for payment'}
                  </Button>
                  <Button variant="outline" onClick={() => setScanOpen(true)} className="w-full">
                    <QrCode className="h-4 w-4 mr-2" /> Scan another GRN
                  </Button>
                </div>
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

      <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit GRN for payment</DialogTitle>
            <DialogDescription>
              Allocate GRN-{lot?.batch_number || batch} ({money(lot?.total_amount_ugx)}) to a finance approver. They
              release the money and print the payment receipt — you are both rewarded once it is paid.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={payerEmail} onValueChange={setPayerEmail}>
              <SelectTrigger><SelectValue placeholder={payersLoading ? 'Loading finance approvers...' : 'Select who should pay'} /></SelectTrigger>
              <SelectContent>
                {(payers || []).map((p) => (
                  <SelectItem key={p.email} value={p.email}>
                    {p.name} {p.position ? `· ${p.position}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!payersLoading && payersError && (
              <p className="text-xs text-destructive">Finance approvers could not be loaded. Refresh and try again.</p>
            )}
            {!payersLoading && !payersError && (payers || []).length === 0 && (
              <p className="text-xs text-muted-foreground">No active finance approvers are available.</p>
            )}
            <Textarea
              placeholder="Notes for the payer (optional)"
              value={referralNotes}
              onChange={(e) => setReferralNotes(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitOpen(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleSubmitForPayment} disabled={submitting || payersLoading || !payerEmail}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkOpen} onOpenChange={(o) => !bulkRunning && setBulkOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit queued GRNs for payment</DialogTitle>
            <DialogDescription>
              {pendingBulkRefs.length} GRN{pendingBulkRefs.length === 1 ? '' : 's'} in your queue will be allocated to
              one finance approver. Already-paid or not-yet-ready GRNs are skipped automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="max-h-32 overflow-y-auto rounded-md border p-2 text-xs font-mono">
              {pendingBulkRefs.map((r) => (
                <div key={r}>{r}</div>
              ))}
            </div>
            <Select value={payerEmail} onValueChange={setPayerEmail}>
              <SelectTrigger>
                <SelectValue placeholder={payersLoading ? 'Loading finance approvers...' : 'Select who should pay'} />
              </SelectTrigger>
              <SelectContent>
                {(payers || []).map((p) => (
                  <SelectItem key={p.email} value={p.email}>
                    {p.name} {p.position ? `· ${p.position}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Notes for the payer (optional)"
              value={referralNotes}
              onChange={(e) => setReferralNotes(e.target.value)}
            />
            {bulkResults.length > 0 && (
              <div className="max-h-40 overflow-y-auto space-y-1 rounded-md border p-2 text-xs">
                {bulkResults.map((r) => (
                  <div key={r.ref} className="flex items-center justify-between gap-2">
                    <span className="font-mono">{r.ref}</span>
                    <span className={r.ok ? 'text-green-700' : 'text-destructive'}>{r.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)} disabled={bulkRunning}>
              Close
            </Button>
            <Button
              onClick={handleBulkSubmit}
              disabled={bulkRunning || payersLoading || !payerEmail || pendingBulkRefs.length === 0}
            >
              {bulkRunning && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit all
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <GRNScannerDialog open={scanOpen} onOpenChange={setScanOpen} />


    </div>
  );
}
