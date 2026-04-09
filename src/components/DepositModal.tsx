import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { Smartphone, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUserAccount } from '@/hooks/useUserAccount';

interface DepositModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'form' | 'pending' | 'done';

export const DepositModal: React.FC<DepositModalProps> = ({ open, onOpenChange }) => {
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>('form');
  const [transactionRef, setTransactionRef] = useState('');
  const { user, employee } = useAuth();
  const { toast } = useToast();
  const { refreshAccount } = useUserAccount();

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !phone || !user) return;

    const depositAmount = parseFloat(amount);
    if (isNaN(depositAmount) || depositAmount < 500) {
      toast({ title: "Invalid Amount", description: "Minimum deposit is UGX 500", variant: "destructive" });
      return;
    }

    // Format phone number
    let cleanPhone = phone.replace(/[\s+\-]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '256' + cleanPhone.slice(1);
    }
    if (!cleanPhone.startsWith('256')) {
      cleanPhone = '256' + cleanPhone;
    }

    if (cleanPhone.length < 12) {
      toast({ title: "Invalid Phone", description: "Please enter a valid phone number", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const ref = `DEP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setTransactionRef(ref);

      // Create transaction record first
      const { error: txError } = await supabase
        .from('mobile_money_transactions')
        .insert({
          user_id: user.id,
          transaction_ref: ref,
          phone: cleanPhone,
          amount: depositAmount,
          transaction_type: 'deposit',
          status: 'pending',
          provider: 'yo_payments',
        });

      if (txError) throw txError;

      // Call the deposit edge function
      const { data, error } = await supabase.functions.invoke('gosentepay-deposit', {
        body: {
          phone: cleanPhone,
          amount: depositAmount,
          email: user.email || employee?.email || '',
          ref,
        },
      });

      if (error) throw error;

      if (data?.status === 'success' || data?.code === 200) {
        setStep('pending');
        toast({
          title: "Payment Request Sent!",
          description: "Check your phone and enter your PIN to confirm the payment.",
          duration: 10000,
        });
      } else {
        // Update transaction status to failed
        await supabase
          .from('mobile_money_transactions')
          .update({ status: 'failed', provider_response: data })
          .eq('transaction_ref', ref);

        throw new Error(data?.message || 'Failed to initiate deposit');
      }
    } catch (error: any) {
      console.error('Deposit error:', error);
      
      // Parse the error body if it's a FunctionsHttpError
      let errorMessage = "Could not initiate mobile money deposit. Try again.";
      try {
        if (error?.context?.body) {
          const body = await error.context.json();
          errorMessage = body?.error || errorMessage;
        } else if (error?.message) {
          // Check if the message contains JSON
          const jsonMatch = error.message.match(/\{.*\}/s);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            errorMessage = parsed?.error || errorMessage;
          } else {
            errorMessage = error.message;
          }
        }
      } catch {
        errorMessage = error?.message || errorMessage;
      }
      
      toast({
        title: "Deposit Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Poll for transaction status
  React.useEffect(() => {
    if (step !== 'pending' || !transactionRef) return;

    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('mobile_money_transactions')
        .select('status')
        .eq('transaction_ref', transactionRef)
        .single();

      if (data?.status === 'completed') {
        setStep('done');
        refreshAccount();
        clearInterval(interval);
        toast({ title: "Deposit Successful!", description: `UGX ${parseFloat(amount).toLocaleString()} has been added to your balance.` });
      } else if (data?.status === 'failed') {
        setStep('form');
        clearInterval(interval);
        toast({ title: "Deposit Failed", description: "The mobile money transaction was not completed.", variant: "destructive" });
      }
    }, 5000);

    // Stop polling after 3 minutes
    const timeout = setTimeout(() => {
      clearInterval(interval);
      if (step === 'pending') {
        toast({ title: "Still Processing", description: "Your deposit is still being processed. Check your balance later." });
      }
    }, 180000);

    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, [step, transactionRef]);

  const handleClose = () => {
    setStep('form');
    setAmount('');
    setPhone('');
    setTransactionRef('');
    onOpenChange(false);
    refreshAccount();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            {step === 'form' && 'Mobile Money Deposit'}
            {step === 'pending' && 'Confirm on Phone'}
            {step === 'done' && 'Deposit Complete'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {step === 'form' && (
            <form onSubmit={handleDeposit} className="space-y-4">
              <Alert>
                <Smartphone className="h-4 w-4" />
                <AlertDescription>
                  A mobile money prompt will be sent to your phone. Enter your PIN to confirm the deposit.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="deposit-phone">Phone Number</Label>
                <Input
                  id="deposit-phone"
                  type="tel"
                  placeholder="e.g. 0759123456 or 256759123456"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">MTN or Airtel Uganda number</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="deposit-amount">Amount (UGX)</Label>
                <Input
                  id="deposit-amount"
                  type="number"
                  placeholder="Enter deposit amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  min="500"
                  step="500"
                />
                {amount && parseFloat(amount) < 500 && (
                  <p className="text-sm text-red-600">Minimum deposit is UGX 500</p>
                )}
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
                <Button type="submit" disabled={loading || !amount || !phone || parseFloat(amount) < 500}>
                  {loading ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</>
                  ) : (
                    'Send Payment Request'
                  )}
                </Button>
              </div>
            </form>
          )}

          {step === 'pending' && (
            <div className="space-y-4 text-center py-4">
              <Loader2 className="h-12 w-12 text-primary mx-auto animate-spin" />
              <h3 className="font-bold text-lg">Waiting for Payment</h3>
              <p className="text-sm text-muted-foreground">
                A payment prompt has been sent to your phone. 
                Please enter your Mobile Money PIN to confirm.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm font-medium text-amber-800">
                  Amount: UGX {parseFloat(amount).toLocaleString()}
                </p>
                <p className="text-xs text-amber-600 mt-1">Ref: {transactionRef}</p>
              </div>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Do not close this window. We're checking for your payment confirmation...
                </AlertDescription>
              </Alert>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
            </div>
          )}

          {step === 'done' && (
            <div className="space-y-4 text-center py-4">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
              <h3 className="font-bold text-lg text-green-800">Deposit Successful!</h3>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-2xl font-bold text-green-700">
                  UGX {parseFloat(amount).toLocaleString()}
                </p>
                <p className="text-sm text-green-600 mt-1">has been added to your balance</p>
                <p className="text-xs text-green-500 mt-2">Ref: {transactionRef}</p>
              </div>
              <Button onClick={handleClose}>Done</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
