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
import { Loader2, CheckCircle2, CreditCard, Printer, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { printGrnPaymentReceipt } from '@/utils/grnPaymentReceipt';

const normalizeRef = (raw: string) =>
  (raw || '').trim().replace(/^GAC-/i, '').replace(/^GRN-DISC-/i, '').replace(/^GRN-/i, '');

const money = (n?: number | null) => `UGX ${Number(n || 0).toLocaleString()}`;

export default function GRNScanPay() {
  const { reference = '' } = useParams();
  const navigate = useNavigate();
  const { user, employee } = useAuth();
  const qc = useQueryClient();
  const batch = useMemo(() => normalizeRef(reference), [reference]);

  const [payOpen, setPayOpen] = useState(false);
  const [method, setMethod] = useState('CASH');
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['grn-scan-lot', batch],
    enabled: !!batch,
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
        .select('id, supplier_name, coffee_type, batch_number, kilograms, created_at')
        .eq('batch_number', batch)
        .limit(1);
      const record: any = recs?.[0] || null;

      let supplierName = record?.supplier_name || null;
      if (!supplierName && lot?.supplier_id) {
        const { data: sup } = await supabase.from('suppliers').select('name').eq('id', lot.supplier_id).maybeSingle();
        supplierName = (sup as any)?.name || null;
      }

      let payment: any = null;
      if (lot?.id) {
        const { data: pays } = await supabase
          .from('supplier_payments')
          .select('*')
          .eq('lot_id', lot.id)
          .order('created_at', { ascending: false })
          .limit(1);
        payment = pays?.[0] || null;
      }

      return { lot, record, supplierName: supplierName || 'Unknown Supplier', payment };
    },
  });

  const lot: any = data?.lot;
  const paid = lot?.finance_status === 'PAID';

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

  if (isLoading) {
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
            <p className="text-sm text-muted-foreground">
              No finance record found for this GRN ({batch}). It may not have been released to Finance yet.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground block">Supplier</span>{data?.supplierName}</div>
                <div><span className="text-muted-foreground block">Coffee type</span>{data?.record?.coffee_type || '—'}</div>
                <div><span className="text-muted-foreground block">Quantity</span>{Number(lot.quantity_kg || 0).toLocaleString()} kg</div>
                <div><span className="text-muted-foreground block">Unit price</span>{money(lot.unit_price_ugx)}</div>
                <div className="col-span-2 text-base font-semibold">
                  <span className="text-muted-foreground block text-xs font-normal">Total payable</span>
                  {money(lot.total_amount_ugx)}
                </div>
              </div>

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
