import React, { useState } from 'react';
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
import { useUserAccount } from '@/hooks/useUserAccount';
import { DollarSign } from 'lucide-react';

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
  const { createMoneyRequest } = useUserAccount();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || !reason) return;

    setLoading(true);
    try {
      await createMoneyRequest(parseFloat(amount), reason, requestType);
      // Reset form
      setAmount('');
      setReason('');
      setRequestType('advance');
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting request:', error);
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
          <div className="space-y-2">
            <Label htmlFor="requestType">Request Type</Label>
            <Select value={requestType} onValueChange={setRequestType}>
              <SelectTrigger>
                <SelectValue placeholder="Select request type" />
              </SelectTrigger>
              <SelectContent>
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