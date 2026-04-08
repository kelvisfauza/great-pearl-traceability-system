import React, { useEffect, useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, ShieldAlert, Loader2, CheckCircle } from 'lucide-react';

const AdminWithdrawalPinPrompt = () => {
  const { user, employee } = useAuth();
  const { toast } = useToast();
  const [pendingWithdrawal, setPendingWithdrawal] = useState<any>(null);
  const [pin, setPin] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const checkPendingWithdrawals = useCallback(async () => {
    if (!user?.email) return;

    const { data } = await supabase
      .from('admin_initiated_withdrawals' as any)
      .select('*')
      .eq('employee_email', user.email)
      .eq('status', 'pending_pin')
      .gt('pin_expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (data && (data as any[]).length > 0) {
      setPendingWithdrawal((data as any[])[0]);
    }
  }, [user?.email]);

  // Initial check + realtime subscription
  useEffect(() => {
    if (!user?.email) return;

    checkPendingWithdrawals();

    const channel = supabase
      .channel('admin-withdrawal-pin-prompt')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_initiated_withdrawals',
          filter: `employee_email=eq.${user.email}`,
        },
        (payload) => {
          const record = payload.new as any;
          if (record.status === 'pending_pin' && new Date(record.pin_expires_at) > new Date()) {
            setPendingWithdrawal(record);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.email, checkPendingWithdrawals]);

  const handleVerify = async () => {
    if (!pendingWithdrawal || pin.length !== 5) return;

    setVerifying(true);
    setError('');

    try {
      // Check PIN expiry
      if (new Date(pendingWithdrawal.pin_expires_at) < new Date()) {
        // Mark as expired
        await supabase
          .from('admin_initiated_withdrawals' as any)
          .update({ status: 'expired' })
          .eq('id', pendingWithdrawal.id);
        setError('PIN has expired. Contact admin to re-initiate.');
        setPendingWithdrawal(null);
        return;
      }

      // Verify PIN
      if (pin !== pendingWithdrawal.pin_code) {
        setError('Incorrect PIN. Please try again.');
        setPin('');
        return;
      }

      // PIN correct - resolve unified user ID for ledger
      const { data: unifiedId } = await supabase
        .rpc('get_unified_user_id', { input_email: pendingWithdrawal.employee_email });
      
      const walletUserId = unifiedId || pendingWithdrawal.employee_id;
      const reference = `ADM-WD-${pendingWithdrawal.id.substring(0, 8).toUpperCase()}`;

      const { error: ledgerError } = await supabase
        .from('ledger_entries' as any)
        .insert({
          user_id: walletUserId,
          entry_type: 'WITHDRAWAL',
          amount: -Math.abs(pendingWithdrawal.amount),
          reference,
          source_category: 'WITHDRAWAL',
          metadata: {
            description: `Cash Withdrawal: ${pendingWithdrawal.reason}`,
            initiated_by: pendingWithdrawal.initiated_by_name,
            type: 'admin_cash_withdrawal',
          },
        });

      if (ledgerError) throw ledgerError;

      // Update withdrawal status
      await supabase
        .from('admin_initiated_withdrawals' as any)
        .update({
          status: 'completed',
          verified_at: new Date().toISOString(),
          ledger_reference: reference,
        })
        .eq('id', pendingWithdrawal.id);

      // Get remaining balance for email
      const { data: balanceData } = await supabase
        .rpc('get_user_balance_safe', { user_email: pendingWithdrawal.employee_email });
      
      const userBalance = (balanceData as any[])?.[0];

      // Send confirmation email
      await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'admin-withdrawal-confirmed',
          recipientEmail: pendingWithdrawal.employee_email,
          idempotencyKey: `admin-wd-confirmed-${pendingWithdrawal.id}`,
          templateData: {
            name: pendingWithdrawal.employee_name,
            amount: Number(pendingWithdrawal.amount).toLocaleString(),
            reason: pendingWithdrawal.reason,
            initiatedBy: pendingWithdrawal.initiated_by_name,
            reference,
            remainingBalance: userBalance
              ? Number(userBalance.wallet_balance).toLocaleString()
              : 'N/A',
          },
        },
      });

      setSuccess(true);
      toast({
        title: 'Withdrawal Confirmed',
        description: `UGX ${Number(pendingWithdrawal.amount).toLocaleString()} has been deducted from your wallet.`,
      });

      // Auto-close after 3 seconds
      setTimeout(() => {
        setPendingWithdrawal(null);
        setSuccess(false);
        setPin('');
      }, 3000);
    } catch (err: any) {
      console.error('Withdrawal verification error:', err);
      setError(err.message || 'Failed to process withdrawal');
    } finally {
      setVerifying(false);
    }
  };

  const handleDecline = async () => {
    if (!pendingWithdrawal) return;

    await supabase
      .from('admin_initiated_withdrawals' as any)
      .update({ status: 'cancelled' })
      .eq('id', pendingWithdrawal.id);

    toast({
      title: 'Withdrawal Declined',
      description: 'You have declined this withdrawal. Contact admin if needed.',
    });

    setPendingWithdrawal(null);
    setPin('');
    setError('');
  };

  if (!pendingWithdrawal) return null;

  return (
    <Dialog open={!!pendingWithdrawal} onOpenChange={(open) => { if (!open) handleDecline(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="h-5 w-5" />
            Admin Withdrawal Request
          </DialogTitle>
          <DialogDescription>
            An administrator has requested to withdraw funds from your wallet.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="text-center py-6 space-y-3">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <p className="font-semibold text-lg">Withdrawal Confirmed!</p>
            <p className="text-sm text-muted-foreground">
              UGX {Number(pendingWithdrawal.amount).toLocaleString()} has been deducted.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Details */}
            <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-bold text-destructive">UGX {Number(pendingWithdrawal.amount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Reason:</span>
                <span className="font-medium">{pendingWithdrawal.reason}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Initiated by:</span>
                <span>{pendingWithdrawal.initiated_by_name}</span>
              </div>
            </div>

            {/* PIN Input */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-center">Enter the 5-digit PIN sent to your email:</p>
              <div className="flex justify-center">
                <InputOTP value={pin} onChange={setPin} maxLength={5}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              {error && (
                <p className="text-xs text-destructive text-center flex items-center justify-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> {error}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleVerify}
                disabled={pin.length !== 5 || verifying}
              >
                {verifying ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                Confirm Withdrawal
              </Button>
              <Button variant="outline" onClick={handleDecline}>
                Decline
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              ⚠️ If you did not authorize this, click Decline and contact admin.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AdminWithdrawalPinPrompt;
