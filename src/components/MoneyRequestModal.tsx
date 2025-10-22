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
          throw new Error('No attendance record found for this week. Please contact admin.');
        }

        if (weeklyAllowance.balance_available < requestAmount) {
          throw new Error(`Insufficient balance. You have ${weeklyAllowance.balance_available} UGX available based on ${weeklyAllowance.days_attended} days attended.`);
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
          {weeklyAllowance && (
            <Alert>
              <Calendar className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <div className="font-medium">Your Weekly Allowance (Based on Attendance)</div>
                  <div className="text-sm">
                    <div>Days Attended: <strong>{weeklyAllowance.days_attended}</strong> days</div>
                    <div>Total Eligible: <strong>UGX {weeklyAllowance.total_eligible_amount?.toLocaleString()}</strong></div>
                    <div>Already Requested: <strong>UGX {weeklyAllowance.amount_requested?.toLocaleString()}</strong></div>
                    <div className="text-green-600 font-medium">Available: UGX {weeklyAllowance.balance_available?.toLocaleString()}</div>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {!weeklyAllowance && requestType === 'lunch_refreshment' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No attendance record found for this week. Please contact admin to mark your attendance first.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="requestType">Request Type</Label>
            <Select value={requestType} onValueChange={setRequestType}>
              <SelectTrigger>
                <SelectValue placeholder="Select request type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lunch_refreshment">Lunch & Refreshments (Attendance-Based)</SelectItem>
                <SelectItem value="advance">Salary Advance</SelectItem>
                <SelectItem value="bonus">Bonus Request</SelectItem>
                <SelectItem value="expense">Expense Reimbursement</SelectItem>
                <SelectItem value="emergency">Emergency Fund</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount (UGX)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              min="1000"
              step="1000"
            />
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
            <Button type="submit" disabled={loading || !amount || !reason}>
              {loading ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};