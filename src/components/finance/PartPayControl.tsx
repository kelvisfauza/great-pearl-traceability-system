import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Coins } from 'lucide-react';
import { waitForFunds } from '@/lib/waitForFunds';

export type PartPaySource = 'provider' | 'withdrawal' | 'supplier' | 'expense';

interface Props {
  sourceType: PartPaySource;
  sourceId: string;
  totalAmount: number;
  payeeName?: string;
  onChanged?: () => void;
}

const ugx = (n: number) => `UGX ${Math.round(n).toLocaleString()}`;

/** Lets Finance pay an approved item in parts and shows paid / balance left. */
const PartPayControl: React.FC<Props> = ({ sourceType, sourceId, totalAmount, payeeName, onChanged }) => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const canSend = sourceType === 'provider' || sourceType === 'withdrawal';
  const [method, setMethod] = useState(canSend ? 'yo' : 'cash');
  const [reference, setReference] = useState('');
  const [saving, setSaving] = useState(false);
  const [waitLeft, setWaitLeft] = useState<number | null>(null);
  const isSend = method === 'yo' || method === 'gosentepay';
  const key = ['partial-payment', sourceType, sourceId];

  const { data: pp } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('partial_payments')
        .select('*, partial_payment_installments(*)')
        .eq('source_type', sourceType)
        .eq('source_id', sourceId)
        .maybeSingle();
      return data;
    },
  });

  const total = Number(pp?.total_amount ?? totalAmount);
  const paid = Number(pp?.paid_amount ?? 0);
  const balance = Math.max(total - paid, 0);

  const submit = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast({ title: 'Enter an amount', variant: 'destructive' });
    if (amt > balance) return toast({ title: `Amount is more than the balance (${ugx(balance)})`, variant: 'destructive' });
    setSaving(true);
    try {
      const call = () => supabase.functions.invoke('finance-partial-payment', {
        body: { action: 'pay', sourceType, sourceId, amount: amt, method, reference: reference || undefined },
      });
      const res = isSend ? await waitForFunds(call, (s) => setWaitLeft(s)) : { ...(await call()), timedOut: false };
      setWaitLeft(null);
      if (res.error) throw res.error;
      const d = res.data as any;
      if (!d?.ok) throw new Error(res.timedOut ? `Not funded after 2 minutes — fund the account and try again. ${d?.error || ''}` : (d?.error || 'Payment failed'));
      toast({
        title: d.fullyPaid ? 'Fully paid' : isSend ? 'Part payment sent' : 'Part payment recorded',
        description: d.fullyPaid
          ? `${ugx(d.total)} fully paid. Confirmations sent.`
          : `Paid ${ugx(d.paid)} of ${ugx(d.total)} — balance ${ugx(d.balance)}. Confirmations sent.`,
      });
      setOpen(false); setAmount(''); setReference('');
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: ['payment-tracker'] });
      onChanged?.();
    } catch (e: any) {
      toast({ title: 'Payment not sent', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
      setWaitLeft(null);
    }
  };

  return (
    <div className="space-y-1">
      {paid > 0 && (
        <div className="space-y-1 text-xs">
          <div className="flex justify-between text-muted-foreground">
            <span>Paid {ugx(paid)}</span>
            <span className="font-medium text-foreground">Balance {ugx(balance)}</span>
          </div>
          <Progress value={total ? (paid / total) * 100 : 0} className="h-1.5" />
        </div>
      )}
      {balance > 0 && (
        <Button size="sm" variant="outline" onClick={() => { setAmount(''); setOpen(true); }}>
          <Coins className="h-4 w-4 mr-1" /> {paid > 0 ? 'Pay balance / part' : 'Pay part'}
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{paid > 0 ? 'Pay balance' : 'Pay part'}{payeeName ? ` — ${payeeName}` : ''}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md border p-2"><div className="text-muted-foreground text-xs">Total</div>{ugx(total)}</div>
              <div className="rounded-md border p-2"><div className="text-muted-foreground text-xs">Paid</div>{ugx(paid)}</div>
              <div className="rounded-md border p-2"><div className="text-muted-foreground text-xs">Balance</div>{ugx(balance)}</div>
            </div>
            <div className="flex gap-2">
              <Input type="number" placeholder="Amount paid now" value={amount} onChange={(e) => setAmount(e.target.value)} />
              <Button variant="secondary" onClick={() => setAmount(String(balance))}>Full balance</Button>
            </div>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {canSend && <SelectItem value="yo">Send now — Mobile money (Yo)</SelectItem>}
                {canSend && <SelectItem value="gosentepay">Send now — GosentePay</SelectItem>}
                <SelectItem value="cash">Cash (already handed over)</SelectItem>
                <SelectItem value="bank">Bank (already transferred)</SelectItem>
                <SelectItem value="mobile money">Mobile money (already sent by hand)</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Reference (optional)" value={reference} onChange={(e) => setReference(e.target.value)} />
            <p className="text-xs text-muted-foreground">
              {isSend
                ? `This sends the amount to ${payeeName || 'the payee'} now. If the account is short, it waits up to 2 minutes for funds.`
                : 'Record money you have actually handed over.'}{' '}
              The person paid, the approving admin, Procurement and Operations get an email and text for every part.
            </p>
            {waitLeft !== null && <p className="text-xs font-medium">Waiting for funds… {waitLeft}s</p>}
            {pp?.partial_payment_installments?.length > 0 && (
              <div className="border-t pt-2 space-y-1">
                {[...pp.partial_payment_installments]
                  .sort((a: any, b: any) => a.created_at.localeCompare(b.created_at))
                  .map((i: any) => (
                    <div key={i.id} className="flex justify-between text-xs">
                      <span>{new Date(i.created_at).toLocaleString()} · {i.method} · {i.paid_by_name}</span>
                      <span>{ugx(i.amount)} (bal {ugx(i.balance_after)})</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={submit} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Record payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PartPayControl;
