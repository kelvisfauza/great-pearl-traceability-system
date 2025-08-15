import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AlertTriangle, Trash2 } from 'lucide-react';

interface DeletionRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  recordData: any;
  tableName: string;
  recordSummary: string;
}

export const DeletionRequestModal: React.FC<DeletionRequestModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  recordData,
  tableName,
  recordSummary
}) => {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { employee } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for this deletion request",
        variant: "destructive"
      });
      return;
    }

    if (!employee) {
      toast({
        title: "Authentication Error",
        description: "Employee information not found",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('deletion_requests')
        .insert({
          table_name: tableName,
          record_id: recordData.id,
          record_data: recordData,
          reason: reason.trim(),
          requested_by: employee.name,
          requested_by_department: employee.department
        });

      if (error) throw error;

      toast({
        title: "Deletion Request Submitted",
        description: "Your deletion request has been sent to administrators for review",
      });

      onSuccess();
      onClose();
      setReason('');
    } catch (error) {
      console.error('Error submitting deletion request:', error);
      toast({
        title: "Error",
        description: "Failed to submit deletion request",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
      setReason('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-500" />
            Request Deletion Approval
          </DialogTitle>
          <DialogDescription>
            Submit a request to delete this record. Administrator approval is required for all deletions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Warning Notice */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium">Administrative Approval Required</p>
                <p>All deletion requests must be reviewed and approved by an administrator before execution.</p>
              </div>
            </div>
          </div>

          {/* Record Summary */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <Label className="text-sm font-medium">Record to be deleted:</Label>
            <p className="text-sm text-gray-700 mt-1">{recordSummary}</p>
            <p className="text-xs text-gray-500 mt-1">Table: {tableName}</p>
          </div>

          {/* Reason Input */}
          <div className="space-y-2">
            <Label htmlFor="reason">
              Reason for Deletion <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="Please provide a detailed reason for why this record should be deleted..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[100px]"
              disabled={isSubmitting}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2">
            <Button 
              variant="outline" 
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={isSubmitting || !reason.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmitting ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};