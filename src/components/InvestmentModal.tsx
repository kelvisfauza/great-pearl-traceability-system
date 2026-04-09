import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TrendingUp, Shield, Clock, AlertTriangle } from 'lucide-react';
import { useInvestments } from '@/hooks/useInvestments';

interface InvestmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableBalance: number;
}

export const InvestmentModal = ({ open, onOpenChange, availableBalance }: InvestmentModalProps) => {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const { createInvestment } = useInvestments();

  const numAmount = Number(amount) || 0;
  const expectedReturn = numAmount * 1.1;
  const profit = numAmount * 0.1;

  const handleInvest = async () => {
    if (numAmount < 100000) return;
    if (numAmount > availableBalance) return;
    setLoading(true);
    const success = await createInvestment(numAmount);
    setLoading(false);
    if (success) {
      setAmount('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Invest & Earn
          </DialogTitle>
          <DialogDescription>
            Lock your funds for 5 months and earn 10% interest
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info cards */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-blue-50 rounded-lg p-3">
              <TrendingUp className="h-4 w-4 mx-auto text-blue-600 mb-1" />
              <p className="text-lg font-bold text-blue-700">10%</p>
              <p className="text-[10px] text-muted-foreground">Interest Rate</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-3">
              <Clock className="h-4 w-4 mx-auto text-purple-600 mb-1" />
              <p className="text-lg font-bold text-purple-700">5</p>
              <p className="text-[10px] text-muted-foreground">Months Lock</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-3">
              <Shield className="h-4 w-4 mx-auto text-amber-600 mb-1" />
              <p className="text-lg font-bold text-amber-700">3%</p>
              <p className="text-[10px] text-muted-foreground">Early Exit Rate</p>
            </div>
          </div>

          <div>
            <Label>Investment Amount (UGX)</Label>
            <Input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="Min 100,000"
              min={100000}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Available: UGX {availableBalance.toLocaleString()} · Min: UGX 100,000
            </p>
          </div>

          {numAmount >= 100000 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span>Principal</span>
                <span className="font-medium">UGX {numAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm text-green-700">
                <span>Interest (10%)</span>
                <span className="font-medium">+ UGX {profit.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t border-green-200 pt-1">
                <span>Total Return</span>
                <span className="text-green-700">UGX {expectedReturn.toLocaleString()}</span>
              </div>
            </div>
          )}

          <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>Early withdrawal is allowed but reduces your interest rate from 10% to 3%.</span>
          </div>

          <Button
            onClick={handleInvest}
            disabled={loading || numAmount < 100000 || numAmount > availableBalance}
            className="w-full"
          >
            {loading ? 'Processing...' : `Invest UGX ${numAmount.toLocaleString()}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
