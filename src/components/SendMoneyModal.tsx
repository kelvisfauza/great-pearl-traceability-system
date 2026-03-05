import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Send, CheckCircle, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface SendMoneyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableBalance: number;
}

export const SendMoneyModal: React.FC<SendMoneyModalProps> = ({
  open, onOpenChange, availableBalance,
}) => {
  const { user, employee } = useAuth();
  const { toast } = useToast();
  const [employees, setEmployees] = useState<any[]>([]);
  const [recipientId, setRecipientId] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [txRef, setTxRef] = useState('');

  useEffect(() => {
    if (!open) return;
    setRecipientId('');
    setAmount('');
    setSuccess(false);
    setTxRef('');
    // Fetch active employees
    const fetchEmployees = async () => {
      // Use security definer function to bypass RLS so all users can see recipients
      const { data } = await supabase.rpc('get_guarantor_candidates');
      setEmployees((data || []).filter(e => e.email !== (employee?.email || user?.email)));
    };
    fetchEmployees();
  }, [open, employee?.email, user?.email]);

  const parsedAmount = parseFloat(amount) || 0;
  const selectedRecipient = employees.find(e => e.id === recipientId);

  const handleSend = async () => {
    if (!selectedRecipient || parsedAmount <= 0) return;

    if (parsedAmount < 500) {
      toast({ title: 'Minimum is UGX 500', variant: 'destructive' });
      return;
    }
    if (parsedAmount > availableBalance) {
      toast({ title: 'Insufficient balance', description: `Available: UGX ${availableBalance.toLocaleString()}`, variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const senderEmail = employee?.email || user?.email;
      if (!senderEmail) throw new Error('Sender not identified');

      // Resolve sender unified ID
      const { data: senderUserId } = await supabase.rpc('get_unified_user_id', { input_email: senderEmail });
      if (!senderUserId) throw new Error('Could not resolve sender account');

      // Resolve receiver unified ID
      const { data: receiverUserId } = await supabase.rpc('get_unified_user_id', { input_email: selectedRecipient.email });
      if (!receiverUserId) throw new Error('Could not resolve receiver account');

      const ref = `SEND-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

      // Deduct from sender
      const { error: deductErr } = await supabase.from('ledger_entries').insert({
        user_id: senderUserId,
        entry_type: 'WITHDRAWAL',
        amount: -parsedAmount,
        reference: ref,
        metadata: {
          type: 'wallet_transfer',
          to_email: selectedRecipient.email,
          to_name: selectedRecipient.name,
          description: `Sent UGX ${parsedAmount.toLocaleString()} to ${selectedRecipient.name}`,
        },
      });
      if (deductErr) throw new Error('Failed to deduct from your wallet');

      // Credit receiver
      const { error: creditErr } = await supabase.from('ledger_entries').insert({
        user_id: receiverUserId,
        entry_type: 'DEPOSIT',
        amount: parsedAmount,
        reference: ref,
        metadata: {
          type: 'wallet_transfer',
          from_email: senderEmail,
          from_name: employee?.name || 'Unknown',
          description: `Received UGX ${parsedAmount.toLocaleString()} from ${employee?.name || senderEmail}`,
        },
      });
      if (creditErr) {
        // Rollback sender deduction
        await supabase.from('ledger_entries').insert({
          user_id: senderUserId,
          entry_type: 'ADJUSTMENT',
          amount: parsedAmount,
          reference: `ROLLBACK-${ref}`,
          metadata: { type: 'transfer_rollback', original_ref: ref },
        });
        throw new Error('Failed to credit receiver. Your deduction has been reversed.');
      }

      // Compute receiver's new balance for SMS
      const { data: receiverEntries } = await supabase
        .from('ledger_entries')
        .select('amount')
        .eq('user_id', receiverUserId)
        .in('entry_type', ['LOYALTY_REWARD', 'BONUS', 'DEPOSIT', 'WITHDRAWAL', 'ADJUSTMENT']);
      const receiverBalance = (receiverEntries || []).reduce((s: number, e: any) => s + Number(e.amount), 0);

      // Send SMS to receiver
      if (selectedRecipient.phone) {
        await supabase.functions.invoke('send-sms', {
          body: {
            phone: selectedRecipient.phone,
            message: `Dear ${selectedRecipient.name}, you have received UGX ${parsedAmount.toLocaleString()} from ${employee?.name || senderEmail}. Your wallet balance is now UGX ${receiverBalance.toLocaleString()}. Transaction ID: ${ref}. - Great Pearl Coffee`,
            userName: selectedRecipient.name,
            messageType: 'wallet_transfer',
          },
        });
      }

      setTxRef(ref);
      setSuccess(true);
      toast({
        title: 'Money Sent Successfully!',
        description: `UGX ${parsedAmount.toLocaleString()} sent to ${selectedRecipient.name}. Ref: ${ref}`,
        duration: 8000,
      });
    } catch (err: any) {
      toast({ title: 'Transfer Failed', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" /> Send Money
          </DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="space-y-4 text-center py-4">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
            <h3 className="text-lg font-semibold">Transfer Complete!</h3>
            <p className="text-sm text-muted-foreground">
              UGX {parsedAmount.toLocaleString()} sent to <strong>{selectedRecipient?.name}</strong>
            </p>
            <p className="text-xs text-muted-foreground">Transaction ID: {txRef}</p>
            <Button onClick={() => onOpenChange(false)} className="w-full">Done</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <div className="flex justify-between text-sm">
                  <span>Your Available Balance:</span>
                  <span className="font-semibold">UGX {availableBalance.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            <div>
              <Label>Recipient</Label>
              <Select value={recipientId} onValueChange={setRecipientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee to send to" />
                </SelectTrigger>
                <SelectContent>
                  {employees.length === 0 && (
                    <div className="p-2 text-sm text-muted-foreground text-center">No employees found</div>
                  )}
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name} — {emp.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Amount (UGX)</Label>
              <Input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="e.g. 10000"
                min={500}
              />
              <p className="text-xs text-muted-foreground mt-1">Minimum: UGX 500</p>
            </div>

            {parsedAmount > 0 && selectedRecipient && (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-3 text-sm space-y-1">
                  <div className="flex justify-between"><span>Sending:</span><span className="font-semibold">UGX {parsedAmount.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>To:</span><span className="font-semibold">{selectedRecipient.name}</span></div>
                  <div className="flex justify-between text-muted-foreground"><span>Your new balance:</span><span>UGX {Math.max(0, availableBalance - parsedAmount).toLocaleString()}</span></div>
                </CardContent>
              </Card>
            )}

            <Button
              onClick={handleSend}
              disabled={loading || !recipientId || parsedAmount < 500 || parsedAmount > availableBalance}
              className="w-full"
            >
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
              ) : (
                <><Send className="mr-2 h-4 w-4" /> Send UGX {parsedAmount.toLocaleString()}</>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
