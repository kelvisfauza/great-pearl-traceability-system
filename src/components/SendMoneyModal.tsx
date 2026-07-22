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
import { Loader2, Send, CheckCircle, Smartphone, Users, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWithdrawalControl } from '@/hooks/useWithdrawalControl';
import { AlertTriangle } from 'lucide-react';

interface SendMoneyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableBalance: number;
  overdraftHeadroom?: number;
  walletBalance?: number;
  overdraftOutstanding?: number;
}

export const SendMoneyModal: React.FC<SendMoneyModalProps> = ({
  open, onOpenChange, availableBalance, overdraftHeadroom = 0, walletBalance, overdraftOutstanding = 0,
}) => {
  const { user, employee, isAdmin } = useAuth();
  const { toast } = useToast();
  const { isWithdrawalDisabled } = useWithdrawalControl();
  const wdState = isWithdrawalDisabled();
  const adminUser = isAdmin();
  const restricted = wdState.disabled && !adminUser;
  const EMPLOYEE_CAP_RESTRICTED = 50000;
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
  const [overdraftConfirmed, setOverdraftConfirmed] = useState(false);
  const [overdraftConfirmedMobile, setOverdraftConfirmedMobile] = useState(false);

  useEffect(() => {
    if (!open) return;
    setRecipientId('');
    setAmount('');
    setMobilePhone('');
    setMobileAmount('');
    setSuccess(false);
    setTxRef('');
    setSuccessMessage('');
    setOverdraftConfirmed(false);
    setOverdraftConfirmedMobile(false);
    setTab(restricted ? 'employee' : 'employee');
    const fetchEmployees = async () => {
      const { data } = await supabase.rpc('get_guarantor_candidates');
      setEmployees((data || []).filter(e => e.email !== (employee?.email || user?.email)));
    };
    fetchEmployees();
  }, [open, employee?.email, user?.email, restricted]);

  const parsedAmount = parseFloat(amount) || 0;
  const selectedRecipient = employees.find(e => e.id === recipientId);
  const parsedMobileAmount = parseFloat(mobileAmount) || 0;

  // Wallet-only balance (without overdraft). Defaults to availableBalance if not provided.
  const walletOnly = typeof walletBalance === 'number' ? walletBalance : Math.max(0, availableBalance - overdraftHeadroom);
  const employeeOdPortion = Math.max(0, Math.min(parsedAmount, availableBalance) - walletOnly);
  const OD_FEE_RATE = 0.0275;
  const employeeOdFee = Math.round(employeeOdPortion * OD_FEE_RATE);
  const employeeNewOutstanding = overdraftOutstanding + employeeOdPortion + employeeOdFee;
  const employeeNeedsOdConfirm = employeeOdPortion > 0 && !overdraftConfirmed;

  // Tiered withdrawal service fee — mirrors supabase/functions/instant-withdrawal computeWithdrawFee.
  // Charged in addition to the payout amount on every mobile-money send.
  const computeWithdrawFee = (a: number): number => {
    if (a < 500) return 0;
    if (a <= 60_000) return 1_100;
    if (a <= 500_000) return 1_700;
    if (a <= 1_000_000) return 2_500;
    return 2_900;
  };
  const mobileServiceFee = computeWithdrawFee(parsedMobileAmount);
  const mobileTotalDebit = parsedMobileAmount + mobileServiceFee;
  const mobileOdPortion = Math.max(0, Math.min(mobileTotalDebit, availableBalance) - walletOnly);
  const mobileOdFee = Math.round(mobileOdPortion * OD_FEE_RATE);
  const mobileNewOutstanding = overdraftOutstanding + mobileOdPortion + mobileOdFee;
  const mobileNeedsOdConfirm = mobileOdPortion > 0 && !overdraftConfirmedMobile;

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
    if (restricted && parsedAmount > EMPLOYEE_CAP_RESTRICTED) {
      toast({
        title: 'Transfer cap active',
        description: `Withdrawals are paused. While paused, employee-to-employee transfers are capped at UGX ${EMPLOYEE_CAP_RESTRICTED.toLocaleString()}.`,
        variant: 'destructive',
      });
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
        p_use_overdraft: overdraftConfirmed,
      });

      if (transferErr) throw new Error(transferErr.message);

      const result = typeof transferResult === 'string' ? JSON.parse(transferResult) : transferResult;
      if (!result?.success) throw new Error(result?.error || 'Transfer failed');

      const receiverBalance = Number(
        result.receiver_wallet_after ?? result.receiver_balance ?? 0
      );
      const senderAvailableBalance = Number(
        result.sender_wallet_after ?? result.sender_available_balance ?? (availableBalance - parsedAmount)
      );

      // Send SMS to receiver
      if (selectedRecipient.phone) {
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
        supabase.functions.invoke('send-sms', {
          body: {
            phone: senderPhone,
            message: `Dear ${employee?.name || senderEmail}, UGX ${parsedAmount.toLocaleString()} has been sent to ${selectedRecipient.name} from your wallet. Your new balance is UGX ${senderAvailableBalance.toLocaleString()}. Ref: ${ref}. - Great Agro Coffee`,
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
            newBalance: String(receiverBalance),
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
            newBalance: String(senderAvailableBalance),
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

    if (restricted) {
      toast({
        title: 'Mobile money disabled',
        description: 'Sending to a phone number is disabled while withdrawals are paused. Use employee-to-employee transfers (max UGX 50,000).',
        variant: 'destructive',
      });
      return;
    }

    if (parsedMobileAmount < 2000) {
      toast({ title: 'Minimum is UGX 2,000', variant: 'destructive' });
      return;
    }
    // Hard cap: UGX 100,000 per single mobile money send
    const MOBILE_DAILY_CAP = 100000;
    if (parsedMobileAmount > MOBILE_DAILY_CAP) {
      toast({
        title: 'Mobile money limit',
        description: `Maximum send to a mobile number is UGX ${MOBILE_DAILY_CAP.toLocaleString()} per transaction. For internal transfers to staff there is no limit.`,
        variant: 'destructive',
      });
      return;
    }
    if (mobileTotalDebit > availableBalance) {
      toast({
        title: 'Insufficient balance',
        description: `Available: UGX ${availableBalance.toLocaleString()}. This send needs UGX ${mobileTotalDebit.toLocaleString()} (amount + UGX ${mobileServiceFee.toLocaleString()} service fee).`,
        variant: 'destructive',
      });
      return;
    }

    // Validate phone format
    const cleanPhone = mobilePhone.replace(/\D/g, '');
    const localPhone = cleanPhone.startsWith('256') ? '0' + cleanPhone.slice(3) : cleanPhone;
    const validPrefixes = ['070', '074', '075', '076', '077', '078', '079'];
    if (!validPrefixes.some(p => localPhone.startsWith(p)) || localPhone.length !== 10) {
      toast({ title: 'Invalid phone number', description: 'Enter a valid Ugandan mobile money number (e.g. 0770123456)', variant: 'destructive' });
      return;
    }

    // 24-hour cumulative cap on mobile sends (UGX 100,000)
    try {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: unifiedId } = await supabase.rpc('get_unified_user_id', { input_email: employee?.email });
      const uid = unifiedId || (employee as any)?.auth_user_id || (employee as any)?.id;
      if (uid) {
        const { data: recent } = await supabase
          .from('instant_withdrawals')
          .select('amount, payout_status, created_at')
          .eq('user_id', uid)
          .gte('created_at', since);
        const used = (recent || [])
          .filter((r: any) => !['failed', 'rejected'].includes(String(r.payout_status || '').toLowerCase()))
          .reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
        const remaining = Math.max(0, MOBILE_DAILY_CAP - used);
        if (parsedMobileAmount > remaining) {
          toast({
            title: '24-hour limit reached',
            description: `You can send up to UGX ${MOBILE_DAILY_CAP.toLocaleString()} to mobile money per 24 hours. Used: UGX ${used.toLocaleString()}. Remaining: UGX ${remaining.toLocaleString()}. Internal transfers to fellow staff have no limit.`,
            variant: 'destructive',
            duration: 9000,
          });
          return;
        }
      }
    } catch (_e) { /* non-blocking; edge function also enforces */ }

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
                {overdraftHeadroom > 0 && (
                  <div className="flex justify-between text-xs text-emerald-600 mt-1">
                    <span>Includes overdraft:</span>
                    <span>+ UGX {overdraftHeadroom.toLocaleString()}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {restricted && (
              <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
                <CardContent className="p-3 flex items-start gap-2 text-xs text-amber-900 dark:text-amber-200">
                  <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-600 shrink-0" />
                  <div>
                    <p className="font-semibold">Withdrawals are temporarily paused{wdState.reason ? `: ${wdState.reason}` : ''}.</p>
                    <ul className="list-disc pl-4 mt-1 space-y-0.5">
                      <li>Employee-to-employee transfers are capped at <strong>UGX {EMPLOYEE_CAP_RESTRICTED.toLocaleString()}</strong>.</li>
                      <li>Sending to a phone number (mobile money) is disabled.</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}

            <Tabs value={tab} onValueChange={(v) => setTab(v as 'employee' | 'mobile')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="employee" className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" /> To Employee
                </TabsTrigger>
                <TabsTrigger value="mobile" disabled={restricted} className="flex items-center gap-1.5">
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
                    max={restricted ? EMPLOYEE_CAP_RESTRICTED : undefined}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Minimum: UGX 500{restricted ? ` · Maximum (paused mode): UGX ${EMPLOYEE_CAP_RESTRICTED.toLocaleString()}` : ''}
                  </p>
                </div>

                {parsedAmount > 0 && selectedRecipient && (
                  <Card className="border-primary/30 bg-primary/5">
                    <CardContent className="p-3 text-sm space-y-1">
                      <div className="flex justify-between"><span>Sending:</span><span className="font-semibold">UGX {parsedAmount.toLocaleString()}</span></div>
                      <div className="flex justify-between"><span>To:</span><span className="font-semibold">{selectedRecipient.name}</span></div>
                      {employeeOdPortion > 0 && (
                        <>
                          <div className="flex justify-between text-muted-foreground"><span>From wallet:</span><span>UGX {Math.min(parsedAmount, walletOnly).toLocaleString()}</span></div>
                          <div className="flex justify-between text-emerald-700"><span>From overdraft:</span><span>UGX {employeeOdPortion.toLocaleString()}</span></div>
                          <div className="flex justify-between text-amber-700"><span>Overdraft access fee (2.75%):</span><span>UGX {employeeOdFee.toLocaleString()}</span></div>
                          {overdraftOutstanding > 0 && (
                            <div className="flex justify-between text-muted-foreground"><span>Previous overdraft balance:</span><span>UGX {overdraftOutstanding.toLocaleString()}</span></div>
                          )}
                          <div className="flex justify-between font-semibold text-red-700 border-t pt-1 mt-1"><span>New overdraft owed (shown on statement):</span><span>UGX {employeeNewOutstanding.toLocaleString()}</span></div>
                        </>
                      )}
                      <div className="flex justify-between text-muted-foreground"><span>Your new balance:</span><span>UGX {Math.max(0, walletOnly - parsedAmount).toLocaleString()}</span></div>
                    </CardContent>
                  </Card>
                )}

                {employeeOdPortion > 0 && (
                  <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
                    <CardContent className="p-3 text-xs space-y-2">
                      <div className="flex items-start gap-2 text-amber-900 dark:text-amber-200">
                        <TrendingDown className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" />
                        <div>
                          <p className="font-semibold">Overdraft will be applied: UGX {employeeOdPortion.toLocaleString()}</p>
                          <p className="mt-0.5">Your wallet doesn't fully cover this. UGX {employeeOdPortion.toLocaleString()} will be drawn plus a 2.75% access fee of UGX {employeeOdFee.toLocaleString()}. Your total overdraft owed will become <strong>UGX {employeeNewOutstanding.toLocaleString()}</strong> (0.6% daily interest until cleared). This full amount will appear on your statement.</p>
                        </div>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer text-amber-900 dark:text-amber-200">
                        <input type="checkbox" checked={overdraftConfirmed} onChange={(e) => setOverdraftConfirmed(e.target.checked)} className="h-4 w-4" />
                        <span>I approve using my overdraft for this transfer.</span>
                      </label>
                    </CardContent>
                  </Card>
                )}

                <Button
                  onClick={handleSendToEmployee}
                  disabled={loading || !recipientId || parsedAmount < 500 || parsedAmount > availableBalance || (restricted && parsedAmount > EMPLOYEE_CAP_RESTRICTED) || employeeNeedsOdConfirm}
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
                  <p className="text-xs text-muted-foreground mt-1">MTN (077/078/076/079) or Airtel (070/075/074)</p>
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
                      {mobileServiceFee > 0 && (
                        <div className="flex justify-between text-amber-700"><span>Service fee:</span><span>UGX {mobileServiceFee.toLocaleString()}</span></div>
                      )}
                      <div className="flex justify-between font-semibold border-t pt-1 mt-1"><span>Total charged to wallet:</span><span>UGX {mobileTotalDebit.toLocaleString()}</span></div>
                      {mobileOdPortion > 0 && (
                        <>
                          <div className="flex justify-between text-muted-foreground"><span>From wallet:</span><span>UGX {Math.min(mobileTotalDebit, walletOnly).toLocaleString()}</span></div>
                          <div className="flex justify-between text-emerald-700"><span>From overdraft:</span><span>UGX {mobileOdPortion.toLocaleString()}</span></div>
                          <div className="flex justify-between text-amber-700"><span>Overdraft access fee (2.75%):</span><span>UGX {mobileOdFee.toLocaleString()}</span></div>
                          {overdraftOutstanding > 0 && (
                            <div className="flex justify-between text-muted-foreground"><span>Previous overdraft balance:</span><span>UGX {overdraftOutstanding.toLocaleString()}</span></div>
                          )}
                          <div className="flex justify-between font-semibold text-red-700 border-t pt-1 mt-1"><span>New overdraft owed (shown on statement):</span><span>UGX {mobileNewOutstanding.toLocaleString()}</span></div>
                        </>
                      )}
                      <div className="flex justify-between text-muted-foreground"><span>Your new balance:</span><span>UGX {Math.max(0, walletOnly - mobileTotalDebit).toLocaleString()}</span></div>
                    </CardContent>
                  </Card>
                )}

                {mobileOdPortion > 0 && (
                  <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
                    <CardContent className="p-3 text-xs space-y-2">
                      <div className="flex items-start gap-2 text-amber-900 dark:text-amber-200">
                        <TrendingDown className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" />
                        <div>
                          <p className="font-semibold">Overdraft will be applied: UGX {mobileOdPortion.toLocaleString()}</p>
                          <p className="mt-0.5">Your wallet doesn't fully cover this. UGX {mobileOdPortion.toLocaleString()} will be drawn plus a 2.75% access fee of UGX {mobileOdFee.toLocaleString()}. Your total overdraft owed will become <strong>UGX {mobileNewOutstanding.toLocaleString()}</strong> (0.6% daily interest until cleared). This full amount will appear on your statement.</p>
                        </div>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer text-amber-900 dark:text-amber-200">
                        <input type="checkbox" checked={overdraftConfirmedMobile} onChange={(e) => setOverdraftConfirmedMobile(e.target.checked)} className="h-4 w-4" />
                        <span>I approve using my overdraft for this payout.</span>
                      </label>
                    </CardContent>
                  </Card>
                )}

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                  <p>💡 This sends real money to the mobile money number via Yo Payments. The amount is deducted from your wallet immediately. Available Mon–Sat before 7:15 PM.</p>
                </div>

                <Button
                  onClick={handleSendToMobile}
                  disabled={mobileLoading || !mobilePhone || parsedMobileAmount < 2000 || mobileTotalDebit > availableBalance || mobileNeedsOdConfirm}
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
