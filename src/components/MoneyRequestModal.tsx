import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useUserAccount } from '@/hooks/useUserAccount';
import { useAttendance } from '@/hooks/useAttendance';
import { useAuth } from '@/contexts/AuthContext';
import { DollarSign, Calendar, AlertCircle } from 'lucide-react';

interface MoneyRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MoneyRequestModal: React.FC<MoneyRequestModalProps> = ({
  open,
  onOpenChange,
}) => {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [requestType, setRequestType] = useState('advance');
  const [loading, setLoading] = useState(false);
  const [weeklyAllowance, setWeeklyAllowance] = useState<any>(null);
  const { createMoneyRequest } = useUserAccount();
  const { getCurrentWeekAllowance, deductFromAllowance } = useAttendance();
  const { user } = useAuth();

  useEffect(() => {
    const fetchAllowance = async () => {
      if (open && user?.id) {
        const allowance = await getCurrentWeekAllowance(user.id);
        setWeeklyAllowance(allowance);
      }
    };
    fetchAllowance();
  }, [open, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || !reason) return;

    const requestAmount = parseFloat(amount);

    setLoading(true);
    try {
      // For lunch/refreshment requests, check and deduct from weekly allowance
      if (requestType === 'lunch_refreshment' && user?.id) {
        if (!weeklyAllowance) {
          throw new Error('Unable to load weekly allowance. Please try again.');
        }

        if (weeklyAllowance.balance_available < requestAmount) {
          throw new Error(`Insufficient balance. You have ${weeklyAllowance.balance_available.toLocaleString()} UGX available this week (limit: 15,000 UGX).`);
        }

        // Deduct from allowance
        await deductFromAllowance(user.id, requestAmount);
      }

      await createMoneyRequest(requestAmount, reason, requestType);
      
      // Reset form
      setAmount('');
      setReason('');
      setRequestType('advance');
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error submitting request:', error);
      alert(error.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Request Money
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {requestType === 'lunch_refreshment' && (
            <>
              {weeklyAllowance ? (
                <Alert className="border-green-200 bg-green-50">
                  <Calendar className="h-4 w-4 text-green-600" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <div className="font-semibold text-green-900">Weekly Lunch Allowance (Mon-Sat)</div>
                      <div className="text-sm text-green-800 space-y-1">
                        <div>💰 Weekly Limit: <strong>15,000 UGX</strong></div>
                        <div>✅ Available to Request: <strong className="text-green-700 text-base">{weeklyAllowance.balance_available?.toLocaleString()} UGX</strong></div>
                        <div className="text-xs text-green-600 pt-1">Already requested this week: {weeklyAllowance.amount_requested?.toLocaleString()} UGX</div>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <div className="font-medium">Weekly Allowance Not Available</div>
                      <div className="text-sm">Unable to load your weekly lunch allowance. Please try again or contact admin.</div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="requestType">Request Type</Label>
            <Select value={requestType} onValueChange={setRequestType}>
              <SelectTrigger>
                <SelectValue placeholder="Select request type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lunch_refreshment">
                  🍽️ Weekly Lunch Allowance (15,000 UGX/week)
                </SelectItem>
                <SelectItem value="advance">💰 Salary Advance (From monthly salary)</SelectItem>
                <SelectItem value="bonus">🎁 Bonus Request</SelectItem>
                <SelectItem value="expense">📋 Expense Reimbursement</SelectItem>
                <SelectItem value="emergency">🚨 Emergency Fund</SelectItem>
              </SelectContent>
            </Select>
            
            {requestType === 'lunch_refreshment' && (
              <Alert className="border-blue-200 bg-blue-50">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-xs text-blue-800">
                  <div className="space-y-1">
                    <div className="font-semibold">Weekly Lunch Allowance Policy:</div>
                    <ul className="list-disc list-inside space-y-0.5 ml-1">
                      <li>Fixed allowance: <strong>15,000 UGX per week</strong></li>
                      <li>Coverage: <strong>Monday to Saturday</strong> (Sunday excluded)</li>
                      <li>Auto-refreshes every <strong>Monday</strong></li>
                      <li>Request full amount or in portions throughout the week</li>
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">
              Amount (UGX)
              {requestType === 'lunch_refreshment' && weeklyAllowance && (
                <span className="text-xs text-muted-foreground ml-2">
                  Max: {weeklyAllowance.balance_available?.toLocaleString()} UGX
                </span>
              )}
            </Label>
            <Input
              id="amount"
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              min="1000"
              step="1000"
              max={requestType === 'lunch_refreshment' && weeklyAllowance ? weeklyAllowance.balance_available : undefined}
            />
            {requestType === 'lunch_refreshment' && weeklyAllowance && parseFloat(amount) > weeklyAllowance.balance_available && (
              <p className="text-xs text-destructive">Amount exceeds your available weekly meal allowance</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              placeholder="Please explain why you need this money..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              rows={3}
            />
          </div>

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
              disabled={
                loading || 
                !amount || 
                !reason || 
                (requestType === 'lunch_refreshment' && (!weeklyAllowance || parseFloat(amount) > weeklyAllowance.balance_available))
              }
            >
              {loading ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};