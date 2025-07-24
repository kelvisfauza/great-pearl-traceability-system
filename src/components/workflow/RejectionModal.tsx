
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, AlertTriangle } from 'lucide-react';

interface RejectionModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string, comments?: string) => void;
  title: string;
  description?: string;
}

const REJECTION_REASONS = [
  { value: 'duplicate_order', label: 'Duplicate Order' },
  { value: 'price_too_high', label: 'Offered Price Too High' },
  { value: 'no_demand', label: 'No Demand' },
  { value: 'quality_issues', label: 'Quality Issues' },
  { value: 'insufficient_funds', label: 'Insufficient Funds' },
  { value: 'other', label: 'Other' }
];

export const RejectionModal: React.FC<RejectionModalProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  description
}) => {
  const [reason, setReason] = useState('');
  const [comments, setComments] = useState('');

  const handleConfirm = () => {
    if (!reason) return;
    
    onConfirm(reason, comments);
    setReason('');
    setComments('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            {title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="rejection-reason">Rejection Reason *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {REJECTION_REASONS.map(reasonOption => (
                  <SelectItem key={reasonOption.value} value={reasonOption.value}>
                    {reasonOption.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="comments">Additional Comments</Label>
            <Textarea
              id="comments"
              placeholder="Provide additional details about the rejection..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirm}
            disabled={!reason}
          >
            Confirm Rejection
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
