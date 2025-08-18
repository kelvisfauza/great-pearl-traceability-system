
import { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';

export const useApprovalSystem = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { employee } = useAuth();
  const { createApprovalNotification } = useNotifications();

  const createApprovalRequest = async (
    type: string,
    title: string,
    description: string,
    amount: number,
    details: any
  ) => {
    try {
      setLoading(true);
      
      const requestDoc = {
        type,
        title,
        description,
        amount: amount.toString(),
        department: details.department || 'Finance',
        requestedby: employee?.name || 'Unknown',
        daterequested: new Date().toLocaleDateString(),
        priority: details.priority || 'High',
        status: 'Pending',
        details,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'approval_requests'), requestDoc);
      console.log('Approval request created with ID:', docRef.id);

      // Create notification for administrators - wrap in try-catch to prevent blocking
      try {
        await createApprovalNotification({
          id: docRef.id,
          title,
          amount: amount.toString(),
          requestedBy: employee?.name || 'Unknown',
          department: details.department || 'Finance',
          priority: details.priority || 'High'
        });
        console.log('Notification created successfully');
      } catch (notificationError) {
        console.error('Error creating notification (non-blocking):', notificationError);
        // Don't fail the entire request if notification fails
      }

      toast({
        title: "Approval Request Created",
        description: "Request has been submitted for admin approval"
      });

      return true;
    } catch (error) {
      console.error('Error creating approval request:', error);
      toast({
        title: "Error",
        description: "Failed to create approval request",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    createApprovalRequest,
    loading
  };
};
