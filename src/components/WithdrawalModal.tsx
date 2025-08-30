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
import { useUserAccount } from '@/hooks/useUserAccount';
import { Smartphone, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface WithdrawalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableAmount: number;
}

export const WithdrawalModal: React.FC<WithdrawalModalProps> = ({
  open,
  onOpenChange,
  availableAmount,
}) => {
  const [amount, setAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [channel, setChannel] = useState('ZENGAPAY');
  const [loading, setLoading] = useState(false);
  const { createWithdrawalRequest, refreshAccount } = useUserAccount();
  const { toast } = useToast();

  const formatCurrency = (amount: number) => {
    return `UGX ${amount.toLocaleString()}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || (channel === 'ZENGAPAY' && !phoneNumber)) return;

    const withdrawalAmount = parseFloat(amount);
    if (withdrawalAmount > availableAmount) {
      return;
    }

    setLoading(true);
    try {
      await createWithdrawalRequest(withdrawalAmount, phoneNumber, channel);
      // Reset form
      setAmount('');
      setPhoneNumber('');
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting withdrawal:', error);
    } finally {
      setLoading(false);
    }
  };

  const isAmountValid = amount && parseFloat(amount) <= availableAmount && parseFloat(amount) >= 1000;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Request Withdrawal
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Available to Request: <strong>{formatCurrency(availableAmount)}</strong>
              <br />
              <span className="text-xs text-muted-foreground">
                This prevents double-spending while you have pending withdrawals.
              </span>
            </AlertDescription>
          </Alert>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="channel">Payment Channel</Label>
              <select
                id="channel"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="ZENGAPAY">Mobile Money (ZengaPay)</option>
                <option value="CASH">Cash Payment</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (UGX)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Enter withdrawal amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                min="1000"
                max={availableAmount}
                step="1000"
              />
              {amount && parseFloat(amount) > availableAmount && (
                <p className="text-sm text-red-600">
                  Amount exceeds available to request
                </p>
              )}
            </div>

            {channel === 'ZENGAPAY' && (
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Mobile Money Number</Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="Enter phone number (e.g., 256700123456)"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                  pattern="256[0-9]{9}"
                  title="Please enter a valid Ugandan phone number starting with 256"
                />
                <p className="text-xs text-muted-foreground">
                  Enter phone number with country code (256)
                </p>
              </div>
            )}

            {channel === 'CASH' && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Cash Payment:</strong> You will collect cash directly from Finance department after approval.
                </p>
              </div>
            )}

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Your request will create a Request Slip that you must print and present to Finance. 
                No funds are deducted until Finance approves your request.
              </AlertDescription>
            </Alert>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={loading || !isAmountValid || (channel === 'ZENGAPAY' && !phoneNumber)}
              >
                {loading ? 'Creating Request...' : 'Create Withdrawal Request'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};