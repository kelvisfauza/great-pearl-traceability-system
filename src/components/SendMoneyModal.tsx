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
import { Loader2, Send, CheckCircle, Smartphone, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  const [tab, setTab] = useState<'employee' | 'mobile'>('employee');
  // Employee transfer state
  const [employees, setEmployees] = useState<any[]>([]);
  const [recipientId, setRecipientId] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [txRef, setTxRef] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Mobile money state
  const [mobilePhone, setMobilePhone] = useState('');
  const [mobileAmount, setMobileAmount] = useState('');
  const [mobileLoading, setMobileLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setRecipientId('');
    setAmount('');
    setMobilePhone('');
    setMobileAmount('');
    setSuccess(false);
    setTxRef('');
    setSuccessMessage('');
    setTab('employee');
    const fetchEmployees = async () => {
      const { data } = await supabase.rpc('get_guarantor_candidates');
      setEmployees((data || []).filter(e => e.email !== (employee?.email || user?.email)));
    };
    fetchEmployees();
  }, [open, employee?.email, user?.email]);

  const parsedAmount = parseFloat(amount) || 0;
  const selectedRecipient = employees.find(e => e.id === recipientId);
  const parsedMobileAmount = parseFloat(mobileAmount) || 0;

  const handleSendToEmployee = async () => {
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

      const ref = `SEND-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

      const { data: transferResult, error: transferErr } = await supabase.rpc('transfer_wallet_funds_secure', {
        p_receiver_email: selectedRecipient.email,
        p_amount: parsedAmount,
        p_reference: ref,
      });

      if (transferErr) throw new Error(transferErr.message);

      const result = typeof transferResult === 'string' ? JSON.parse(transferResult) : transferResult;
      if (!result?.success) throw new Error(result?.error || 'Transfer failed');

      // Send SMS to receiver
      if (selectedRecipient.phone) {
        const receiverBalance = result.receiver_balance || 0;
        supabase.functions.invoke('send-sms', {
          body: {
            phone: selectedRecipient.phone,
            message: `Dear ${selectedRecipient.name}, you have received UGX ${parsedAmount.toLocaleString()} from ${employee?.name || senderEmail}. Your wallet balance is now UGX ${Number(receiverBalance).toLocaleString()}. Ref: ${ref}. - Great Agro Coffee`,
            userName: selectedRecipient.name,
            messageType: 'wallet_transfer',
          },
        });
      }

      // Send SMS to sender
      const senderPhone = employee?.phone;
      if (senderPhone) {
        const senderNewBalance = Math.max(0, availableBalance - parsedAmount);
        supabase.functions.invoke('send-sms', {
          body: {
            phone: senderPhone,
            message: `Dear ${employee?.name || senderEmail}, UGX ${parsedAmount.toLocaleString()} has been sent to ${selectedRecipient.name} from your wallet. Your new balance is UGX ${senderNewBalance.toLocaleString()}. Ref: ${ref}. - Great Agro Coffee`,
            userName: employee?.name || senderEmail,
            messageType: 'wallet_transfer',
          },
        });
      }

      // Send emails
      const transferDate = new Date().toLocaleDateString('en-UG', { dateStyle: 'full' });
      supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'wallet-transfer',
          recipientEmail: selectedRecipient.email,
          data: {
            direction: 'received',
            userName: selectedRecipient.name,
            counterpartyName: employee?.name || senderEmail,
            amount: String(parsedAmount),
            newBalance: String(result.receiver_balance || 0),
            reference: ref,
            transferDate,
          }
        }
      });

      supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'wallet-transfer',
          recipientEmail: senderEmail,
          data: {
            direction: 'sent',
            userName: employee?.name || senderEmail,
            counterpartyName: selectedRecipient.name,
            amount: String(parsedAmount),
            newBalance: String(Math.max(0, availableBalance - parsedAmount)),
            reference: ref,
            transferDate,
          }
        }
      });

      setTxRef(ref);
      setSuccessMessage(`UGX ${parsedAmount.toLocaleString()} sent to ${selectedRecipient.name}`);
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

  const handleSendToMobile = async () => {
    if (!mobilePhone || parsedMobileAmount <= 0) return;

    if (parsedMobileAmount < 2000) {
      toast({ title: 'Minimum is UGX 2,000', variant: 'destructive' });
      return;
    }
    if (parsedMobileAmount > availableBalance) {
      toast({ title: 'Insufficient balance', description: `Available: UGX ${availableBalance.toLocaleString()}`, variant: 'destructive' });
      return;
    }

    // Validate phone format
    const cleanPhone = mobilePhone.replace(/\D/g, '');
    const localPhone = cleanPhone.startsWith('256') ? '0' + cleanPhone.slice(3) : cleanPhone;
    const validPrefixes = ['070', '074', '075', '076', '077', '078'];
    if (!validPrefixes.some(p => localPhone.startsWith(p)) || localPhone.length !== 10) {
      toast({ title: 'Invalid phone number', description: 'Enter a valid Ugandan mobile money number (e.g. 0770123456)', variant: 'destructive' });
      return;
    }

    setMobileLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('instant-withdrawal', {
        body: { amount: parsedMobileAmount, depositPhone: mobilePhone },
      });

      if (error) throw new Error(error.message);
      if (!data?.ok && !data?.success) throw new Error(data?.error || 'Payout failed');

      setTxRef(data.ref || '');
      setSuccessMessage(
        data.status === 'pending_approval'
          ? `UGX ${parsedMobileAmount.toLocaleString()} payout to ${mobilePhone} is pending approval. You'll be notified once processed.`
          : `UGX ${parsedMobileAmount.toLocaleString()} sent to ${mobilePhone} via Mobile Money`
      );
      setSuccess(true);
      toast({
        title: data.status === 'pending_approval' ? 'Payout Pending Approval' : 'Mobile Money Sent!',
        description: `Ref: ${data.ref}`,
        duration: 8000,
      });
    } catch (err: any) {
      toast({ title: 'Mobile Money Payout Failed', description: err.message, variant: 'destructive' });
    } finally {
      setMobileLoading(false);
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
            <p className="text-sm text-muted-foreground">{successMessage}</p>
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

            <Tabs value={tab} onValueChange={(v) => setTab(v as 'employee' | 'mobile')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="employee" className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" /> To Employee
                </TabsTrigger>
                <TabsTrigger value="mobile" className="flex items-center gap-1.5">
                  <Smartphone className="h-3.5 w-3.5" /> To Mobile Money
                </TabsTrigger>
              </TabsList>

              <TabsContent value="employee" className="space-y-4 mt-4">
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
                  onClick={handleSendToEmployee}
                  disabled={loading || !recipientId || parsedAmount < 500 || parsedAmount > availableBalance}
                  className="w-full"
                >
                  {loading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                  ) : (
                    <><Send className="mr-2 h-4 w-4" /> Send UGX {parsedAmount.toLocaleString()}</>
                  )}
                </Button>
              </TabsContent>

              <TabsContent value="mobile" className="space-y-4 mt-4">
                <div>
                  <Label>Mobile Money Number</Label>
                  <Input
                    type="tel"
                    value={mobilePhone}
                    onChange={e => setMobilePhone(e.target.value)}
                    placeholder="e.g. 0770123456"
                  />
                  <p className="text-xs text-muted-foreground mt-1">MTN (077/078/076) or Airtel (070/075/074)</p>
                </div>

                <div>
                  <Label>Amount (UGX)</Label>
                  <Input
                    type="number"
                    value={mobileAmount}
                    onChange={e => setMobileAmount(e.target.value)}
                    placeholder="e.g. 10000"
                    min={2000}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Minimum: UGX 2,000</p>
                </div>

                {parsedMobileAmount > 0 && mobilePhone && (
                  <Card className="border-orange-300/50 bg-orange-50/50">
                    <CardContent className="p-3 text-sm space-y-1">
                      <div className="flex justify-between"><span>Sending via Mobile Money:</span><span className="font-semibold">UGX {parsedMobileAmount.toLocaleString()}</span></div>
                      <div className="flex justify-between"><span>To:</span><span className="font-semibold">{mobilePhone}</span></div>
                      <div className="flex justify-between text-muted-foreground"><span>Your new balance:</span><span>UGX {Math.max(0, availableBalance - parsedMobileAmount).toLocaleString()}</span></div>
                    </CardContent>
                  </Card>
                )}

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                  <p>💡 This sends real money to the mobile money number via Yo Payments. The amount is deducted from your wallet immediately. Available Mon–Sat before 7 PM.</p>
                </div>

                <Button
                  onClick={handleSendToMobile}
                  disabled={mobileLoading || !mobilePhone || parsedMobileAmount < 2000 || parsedMobileAmount > availableBalance}
                  className="w-full"
                >
                  {mobileLoading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending to Mobile Money...</>
                  ) : (
                    <><Smartphone className="mr-2 h-4 w-4" /> Send UGX {parsedMobileAmount.toLocaleString()} to Mobile</>
                  )}
                </Button>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
