import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Banknote, Send, Smartphone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type DisburseTarget = {
  requestId: string;
  title: string;
  amount: number;
  phone?: string;
  recipientName?: string;
};

interface Props {
  target: DisburseTarget | null;
  onClose: () => void;
  onDone?: () => void;
}

export const DisbursePaymentModal: React.FC<Props> = ({ target, onClose, onDone }) => {
  const { toast } = useToast();
  const [provider, setProvider] = useState<'yo' | 'gosente' | 'cash'>('gosente');
  const [phone, setPhone] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (target) {
      setPhone(target.phone || '');
      setProvider(Number(target.amount) >= 50000 ? 'yo' : 'gosente');
    }
  }, [target]);

  const handleSend = async () => {
    if (!target) return;
    if (provider !== 'cash' && !phone.trim()) {
      toast({ title: 'Phone required', description: 'Enter the recipient mobile money number.', variant: 'destructive' });
      return;
    }
    setSending(true);
    try {
      const { data: sessionRes } = await supabase.auth.getSession();
      const actorEmail = sessionRes?.session?.user?.email || localStorage.getItem('userEmail') || '';
      const { data, error } = await supabase.functions.invoke('disburse-approval-request', {
        body: { request_id: target.requestId, provider, phone: phone.trim(), actor_email: actorEmail },
      });
      if (error || !data?.ok) {
        toast({
          title: 'Payout Failed',
          description: data?.error || error?.message || 'Could not release the money. You can retry.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: provider === 'cash' ? 'Marked as Cash' : 'Money Released',
          description: `UGX ${Number(target.amount).toLocaleString()} — ${provider === 'cash' ? 'cash prepared' : 'sent'}. Recipient notified by SMS. Ref: ${data.payout_ref}`,
        });
        onDone?.();
        onClose();
      }
    } catch (e: any) {
      toast({ title: 'Payout Error', description: e?.message || 'Unexpected error', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Release Payment
          </DialogTitle>
        </DialogHeader>

        {target && (
          <div className="space-y-5">
            <div className="p-4 rounded-lg border bg-muted/40">
              <p className="font-medium text-foreground">{target.title}</p>
              <p className="text-2xl font-bold text-foreground">UGX {Number(target.amount).toLocaleString()}</p>
              {target.recipientName && (
                <p className="text-sm text-muted-foreground">Recipient: {target.recipientName}</p>
              )}
            </div>

            <div className="space-y-3">
              <Label className="text-base font-semibold">Payment Method</Label>
              <RadioGroup value={provider} onValueChange={(v: 'yo' | 'gosente' | 'cash') => setProvider(v)}>
                <div className="flex items-center space-x-3 p-3 border rounded-lg">
                  <RadioGroupItem value="yo" id="pm-yo" />
                  <Label htmlFor="pm-yo" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Smartphone className="h-4 w-4 text-primary" /> Yo Payments
                    <span className="ml-auto text-xs text-muted-foreground">Best for larger amounts</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 border rounded-lg">
                  <RadioGroupItem value="gosente" id="pm-gs" />
                  <Label htmlFor="pm-gs" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Smartphone className="h-4 w-4 text-primary" /> GosentePay
                    <span className="ml-auto text-xs text-muted-foreground">Small / instant</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 border rounded-lg">
                  <RadioGroupItem value="cash" id="pm-cash" />
                  <Label htmlFor="pm-cash" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Banknote className="h-4 w-4 text-primary" /> Cash (no transfer)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {provider !== 'cash' && (
              <div className="space-y-2">
                <Label htmlFor="pm-phone">Recipient Mobile Money Number</Label>
                <Input
                  id="pm-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="07XXXXXXXX"
                />
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              The recipient receives an SMS confirmation once the money is released.
            </p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={sending}>Later</Button>
          <Button onClick={handleSend} disabled={sending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            {sending ? 'Releasing…' : provider === 'cash' ? 'Mark as Cash & Notify' : 'Release Money'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DisbursePaymentModal;