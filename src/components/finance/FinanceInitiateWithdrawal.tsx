import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { HandCoins, Loader2 } from 'lucide-react';

const MAX = 40000;

export const FinanceInitiateWithdrawal = () => {
  const [emps, setEmps] = useState<{ name: string; email: string }[]>([]);
  const [email, setEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [code, setCode] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [method, setMethod] = useState<'cash' | 'gosentepay' | 'yo'>('cash');
  const [payPhone, setPayPhone] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from('employees').select('name, email').eq('status', 'Active').order('name')
      .then(({ data }) => setEmps((data as any) || []));
  }, []);

  const call = async (action: 'send' | 'verify') => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('finance-wallet-withdraw', {
        body: { action, employeeEmail: email, amount: Number(amount), reason, code, method, payPhone },
      });
      if (error) throw error;
      if (!(data as any)?.ok) throw new Error((data as any)?.error || 'Failed');
      if (action === 'send') {
        setSentTo((data as any).phone);
        if (!payPhone) setPayPhone((data as any).payPhone || '');
        toast.success(`4-digit code sent to the employee (${(data as any).phone})`);
      } else {
        toast.success(`Withdrawn UGX ${Number(amount).toLocaleString()} — paid by ${method === 'cash' ? 'cash' : method === 'gosentepay' ? 'GosentePay' : 'Yo'} — ref ${(data as any).reference}`);
        setPayPhone(''); setMethod('cash');
        setSentTo(null); setCode(''); setAmount(''); setReason(''); setEmail('');
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally { setBusy(false); }
  };

  const amt = Number(amount);
  const canSend = email && amt > 0 && amt <= MAX && reason.trim();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><HandCoins className="h-5 w-5 text-primary" /> Withdraw from employee wallet</CardTitle>
        <CardDescription>Max UGX {MAX.toLocaleString()}. The employee gets a 4-digit code by SMS; enter it to debit their wallet.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label className="text-xs">Employee</Label>
            <select className="w-full h-10 rounded-md border bg-background px-2 text-sm" value={email}
              disabled={!!sentTo} onChange={(e) => setEmail(e.target.value)}>
              <option value="">Select…</option>
              {emps.map((e) => <option key={e.email} value={e.email}>{e.name}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs">Amount (UGX)</Label>
            <Input inputMode="numeric" value={amount} disabled={!!sentTo}
              onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} />
            {amt > MAX && <p className="text-xs text-destructive mt-1">Maximum is UGX {MAX.toLocaleString()}</p>}
          </div>
          <div>
            <Label className="text-xs">Reason</Label>
            <Input value={reason} disabled={!!sentTo} onChange={(e) => setReason(e.target.value)} />
          </div>
        </div>
        {!sentTo ? (
          <Button disabled={!canSend || busy} onClick={() => call('send')}>
            {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Send code to employee
          </Button>
        ) : (
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <Label className="text-xs">Code sent to {sentTo}</Label>
              <Input value={code} placeholder="0000" className="w-32 text-center font-mono tracking-[0.4em]"
                inputMode="numeric" onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))} />
            </div>
            <div>
              <Label className="text-xs">Pay employee by</Label>
              <select className="h-10 rounded-md border bg-background px-2 text-sm" value={method}
                onChange={(e) => setMethod(e.target.value as any)}>
                <option value="cash">Cash</option>
                <option value="gosentepay">GosentePay</option>
                <option value="yo">Yo Payments</option>
              </select>
            </div>
            {method !== 'cash' && (
              <div>
                <Label className="text-xs">Number to send to</Label>
                <Input value={payPhone} placeholder="07XXXXXXXX" className="w-40" inputMode="tel"
                  onChange={(e) => setPayPhone(e.target.value)} />
              </div>
            )}
            <Button disabled={code.length !== 4 || busy || (method !== 'cash' && !payPhone.trim())} onClick={() => call('verify')}>
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Confirm & debit wallet
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => call('send')}>Resend</Button>
            <Button variant="outline" disabled={busy} onClick={() => { setSentTo(null); setCode(''); }}>Cancel</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
