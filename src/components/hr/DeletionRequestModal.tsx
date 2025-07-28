import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';

interface DeletionRequestModalProps {
  open: boolean;
  onClose: () => void;
  employee: {
    id: string;
    name: string;
    position: string;
    email: string;
  };
}

const DeletionRequestModal: React.FC<DeletionRequestModalProps> = ({ open, onClose, employee }) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { employee: currentUser } = useAuth();

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide a reason for deletion",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'deletion_requests'), {
        employee_id: employee.id,
        employee_name: employee.name,
        employee_position: employee.position,
        employee_email: employee.email,
        requested_by: currentUser?.id,
        requester_name: currentUser?.name,
        reason: reason,
        status: 'Pending',
        request_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      toast({
        title: "Deletion Request Submitted",
        description: "Your request has been sent to admin for approval",
      });

      setReason('');
      onClose();
    } catch (error) {
      console.error('Error submitting deletion request:', error);
      toast({
        title: "Error",
        description: "Failed to submit deletion request",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Request Employee Deletion
          </DialogTitle>
          <DialogDescription>
            You are requesting to delete employee: <strong>{employee.name}</strong>
            <br />
            This action requires admin approval.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-muted p-3 rounded-lg">
            <p><strong>Name:</strong> {employee.name}</p>
            <p><strong>Position:</strong> {employee.position}</p>
            <p><strong>Email:</strong> {employee.email}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Deletion *</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please provide a detailed reason for requesting this employee's deletion..."
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={loading}
            variant="destructive"
          >
            {loading ? 'Submitting...' : 'Submit Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeletionRequestModal;