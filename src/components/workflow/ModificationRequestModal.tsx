
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, Edit } from 'lucide-react';

interface ModificationRequestModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (targetDepartment: string, reason: string, comments?: string) => void;
  currentDepartment: string;
}

const DEPARTMENT_OPTIONS = [
  { value: 'Quality', label: 'Quality Control' },
  { value: 'Store', label: 'Store Management' },
  { value: 'Finance', label: 'Finance' },
  { value: 'Procurement', label: 'Procurement' }
];

const MODIFICATION_REASONS = [
  { value: 'price_adjustment', label: 'Price Adjustment Required' },
  { value: 'quality_review', label: 'Quality Review Needed' },
  { value: 'documentation_update', label: 'Documentation Update' },
  { value: 'supplier_change', label: 'Supplier Change Required' },
  { value: 'quantity_adjustment', label: 'Quantity Adjustment' },
  { value: 'other', label: 'Other' }
];

export const ModificationRequestModal: React.FC<ModificationRequestModalProps> = ({
  open,
  onClose,
  onConfirm,
  currentDepartment
}) => {
  const [targetDepartment, setTargetDepartment] = useState('');
  const [reason, setReason] = useState('');
  const [comments, setComments] = useState('');

  const availableDepartments = DEPARTMENT_OPTIONS.filter(
    dept => dept.value !== currentDepartment
  );

  const handleConfirm = () => {
    if (!targetDepartment || !reason) return;
    
    onConfirm(targetDepartment, reason, comments);
    setTargetDepartment('');
    setReason('');
    setComments('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5 text-blue-500" />
            Request Modification
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium">{currentDepartment}</span>
            <ArrowRight className="h-4 w-4" />
            <span>{targetDepartment || 'Select Department'}</span>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="target-department">Send to Department *</Label>
            <Select value={targetDepartment} onValueChange={setTargetDepartment}>
              <SelectTrigger>
                <SelectValue placeholder="Select target department" />
              </SelectTrigger>
              <SelectContent>
                {availableDepartments.map(dept => (
                  <SelectItem key={dept.value} value={dept.value}>
                    {dept.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="modification-reason">Reason for Modification *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {MODIFICATION_REASONS.map(reasonOption => (
                  <SelectItem key={reasonOption.value} value={reasonOption.value}>
                    {reasonOption.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="comments">Instructions/Comments</Label>
            <Textarea
              id="comments"
              placeholder="Provide specific instructions for the modification..."
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
            onClick={handleConfirm}
            disabled={!targetDepartment || !reason}
          >
            Send for Modification
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
