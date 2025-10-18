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

  console.log('💰 AdminApprovalModal rendered - open:', open, 'amount:', amount, 'title:', requestTitle);

  const handleApprove = () => {
    alert('Approve button clicked!'); // This will show immediately
    console.log('💰 AdminApprovalModal - handleApprove called');
    console.log('💰 Payment method:', paymentMethod);
    console.log('💰 Comments:', comments);
    console.log('💰 Calling onApprove with:', paymentMethod, comments);
    onApprove(paymentMethod, comments);
    onOpenChange(false);
    setComments('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Approve Expense Request
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <p className="font-medium text-green-800">{requestTitle}</p>
            <p className="text-2xl font-bold text-green-900">UGX {amount.toLocaleString()}</p>
          </div>

          <div className="space-y-3">
            <Label className="text-base font-medium">Payment Method</Label>
            <RadioGroup value={paymentMethod} onValueChange={(value: 'cash' | 'transfer') => setPaymentMethod(value)}>
              <div className="flex items-center space-x-2 p-3 border rounded-lg">
                <RadioGroupItem value="cash" id="cash" />
                <Label htmlFor="cash" className="flex items-center gap-2 cursor-pointer">
                  <Banknote className="h-4 w-4" />
                  Cash Payment
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border rounded-lg">
                <RadioGroupItem value="transfer" id="transfer" />
                <Label htmlFor="transfer" className="flex items-center gap-2 cursor-pointer">
                  <CreditCard className="h-4 w-4" />
                  Bank Transfer (Payment Slip Required)
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comments">Additional Comments (Optional)</Label>
            <Textarea
              id="comments"
              placeholder="Add any additional notes..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button 
            type="button"
            variant="outline" 
            onClick={() => {
              console.log('💰 Cancel clicked');
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button 
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('💰 Button clicked START');
              console.log('💰 Payment method:', paymentMethod);
              console.log('💰 Comments:', comments);
              console.log('💰 onApprove function:', onApprove);
              console.log('💰 onApprove type:', typeof onApprove);
              
              try {
                console.log('💰 About to call onApprove...');
                onApprove(paymentMethod, comments);
                console.log('💰 onApprove called successfully');
                onOpenChange(false);
                setComments('');
              } catch (error) {
                console.error('💰 ERROR calling onApprove:', error);
                alert('Error: ' + error);
              }
            }}
            className="bg-green-600 hover:bg-green-700"
          >
            Approve Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};