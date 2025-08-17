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

interface WithdrawalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBalance: number;
}

export const WithdrawalModal: React.FC<WithdrawalModalProps> = ({
  open,
  onOpenChange,
  currentBalance,
}) => {
  const [amount, setAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const { createWithdrawalRequest } = useUserAccount();

  const formatCurrency = (amount: number) => {
    return `UGX ${amount.toLocaleString()}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || !phoneNumber) return;

    const withdrawalAmount = parseFloat(amount);
    if (withdrawalAmount > currentBalance) {
      return;
    }

    setLoading(true);
    try {
      await createWithdrawalRequest(withdrawalAmount, phoneNumber);
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

  const isAmountValid = amount && parseFloat(amount) <= currentBalance && parseFloat(amount) >= 1000;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Withdraw to Mobile Money
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Available Balance: <strong>{formatCurrency(currentBalance)}</strong>
            </AlertDescription>
          </Alert>

          <form onSubmit={handleSubmit} className="space-y-4">
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
                max={currentBalance}
                step="1000"
              />
              {amount && parseFloat(amount) > currentBalance && (
                <p className="text-sm text-red-600">
                  Amount exceeds available balance
                </p>
              )}
            </div>

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

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Withdrawal requests are processed within 24 hours. You will receive an SMS confirmation once processed.
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
                disabled={loading || !isAmountValid || !phoneNumber}
              >
                {loading ? 'Processing...' : 'Request Withdrawal'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};