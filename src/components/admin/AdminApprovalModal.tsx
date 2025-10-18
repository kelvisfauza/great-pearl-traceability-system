import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, CreditCard, Banknote } from 'lucide-react';

interface AdminApprovalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: (paymentMethod: 'cash' | 'transfer', comments?: string) => void;
  requestTitle: string;
  amount: number;
}

export const AdminApprovalModal: React.FC<AdminApprovalModalProps> = ({
  open,
  onOpenChange,
  onApprove,
  requestTitle,
  amount
}) => {
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('transfer');
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      await onApprove(paymentMethod, comments);
      setComments('');
      setPaymentMethod('transfer');
      onOpenChange(false);
    } catch (error) {
      console.error('Approval error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-background z-50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Approve Expense Request
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-5">
          <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
            <p className="font-medium text-green-800 dark:text-green-300 mb-1">{requestTitle}</p>
            <p className="text-2xl font-bold text-green-900 dark:text-green-400">UGX {amount.toLocaleString()}</p>
          </div>

          <div className="space-y-3">
            <Label className="text-base font-semibold">Payment Method</Label>
            <RadioGroup value={paymentMethod} onValueChange={(value: 'cash' | 'transfer') => setPaymentMethod(value)}>
              <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent transition-colors cursor-pointer">
                <RadioGroupItem value="cash" id="cash" />
                <Label htmlFor="cash" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Banknote className="h-4 w-4 text-primary" />
                  <span>Cash Payment</span>
                </Label>
              </div>
              <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent transition-colors cursor-pointer">
                <RadioGroupItem value="transfer" id="transfer" />
                <Label htmlFor="transfer" className="flex items-center gap-2 cursor-pointer flex-1">
                  <CreditCard className="h-4 w-4 text-primary" />
                  <span>Bank Transfer</span>
                  <span className="text-xs text-muted-foreground ml-auto">(Payment Slip Required)</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comments">Additional Comments (Optional)</Label>
            <Textarea
              id="comments"
              placeholder="Add any additional notes about this approval..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button 
            type="button"
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            type="button"
            onClick={handleApprove}
            disabled={isSubmitting}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {isSubmitting ? "Approving..." : "Approve Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};