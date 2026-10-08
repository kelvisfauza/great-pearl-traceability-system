import React, { useState } from 'react';
import { useQuotations, Quotation } from '@/hooks/useQuotations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, FileText } from 'lucide-react';
import { waitForFunds } from '@/lib/waitForFunds';

const money = (q: Quotation) => `${q.currency || 'UGX'} ${Math.round(Number(q.amount || 0)).toLocaleString()}`;
const LIVE = ['GosentePay', 'Yo Mobile Money'];

/** Approved quotations/invoices waiting for Finance to pay. GosentePay / Yo send real money; others record a payment already made. */
const FinanceQuotationPayments: React.FC = () => {
  const { quotations, markDisbursed } = useQuotations();
  const { toast } = useToast();
  const [active, setActive] = useState<Quotation | null>(null);
  const [method, setMethod] = useState('GosentePay');
  const [ref, setRef] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [waitLeft, setWaitLeft] = useState<number | null>(null);

  const waiting = quotations.filter((q) => q.status === 'approved' && q.finance_status !== 'disbursed');
  if (!waiting.length) return null;
  const live = LIVE.includes(method);

  const open = (q: Quotation) => { setActive(q); setPhone((q as any).phone || ''); setRef(''); };

  const save = async () => {
    if (!active) return;
    setSaving(true);
    try {
      const call = () => markDisbursed(active.id, method, ref || undefined, live ? phone : undefined);
      if (live) await waitForFunds(call, setWaitLeft); else await call();
      toast({ title: live ? 'Money sent' : 'Payment recorded', description: `${active.company_name} has been sent a text and email.` });
      setActive(null); setRef('');
    } catch (e: any) {
      toast({ title: 'Not paid', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); setWaitLeft(null); }
  };

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileText className="h-4 w-4" /> Approved quotations & invoices to pay</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {waiting.map((q) => (
          <div key={q.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm">
            <div>
              <div className="font-medium">{q.company_name} — {money(q)}</div>
              <div className="text-xs text-muted-foreground">{q.reference} · {q.subject} · approved by {q.approval_by || 'Admin'}{q.finance_status === 'processing' ? ' · payment in progress' : ''}</div>
            </div>
            <Button size="sm" onClick={() => open(q)} disabled={q.finance_status === 'processing'}>Pay</Button>
          </div>
        ))}
      </CardContent>
      <Dialog open={!!active} onOpenChange={(o) => !o && !saving && setActive(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Pay {active?.reference}</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <p>{active?.company_name} — {active && money(active)}</p>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="GosentePay">Send now — GosentePay</SelectItem>
                <SelectItem value="Yo Mobile Money">Send now — Mobile money (Yo)</SelectItem>
                <SelectItem value="Cash">Cash (already handed over)</SelectItem>
                <SelectItem value="Bank Transfer">Bank (already transferred)</SelectItem>
                <SelectItem value="Cheque">Cheque (already issued)</SelectItem>
              </SelectContent>
            </Select>
            {live && <Input placeholder="Phone number to receive the money" value={phone} onChange={(e) => setPhone(e.target.value)} />}
            <Input placeholder="Payment reference (optional)" value={ref} onChange={(e) => setRef(e.target.value)} />
            <p className="text-xs text-muted-foreground">
              {live ? 'The money is sent now from the Operations account. If it is short, the system waits up to 2 minutes for funds.' : 'Records a payment you have already made.'} The company gets a text and email once paid.
            </p>
            {waitLeft !== null && <p className="text-xs text-muted-foreground">Waiting for funds… {waitLeft}s</p>}
          </div>
          <DialogFooter>
            <Button onClick={save} disabled={saving || (live && !phone.trim())}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} {live ? 'Send payment' : 'Record payment'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default FinanceQuotationPayments;
