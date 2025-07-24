
import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, doc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useWorkflowTracking } from './useWorkflowTracking';

export interface ApprovalRequest {
  id: string;
  department: string;
  type: string;
  title: string;
  description: string;
  amount: string;
  requestedby: string;
  daterequested: string;
  priority: string;
  status: string;
  details?: {
    paymentId?: string;
    method?: string;
    supplier?: string;
    amount?: number;
    batchNumber?: string;
    qualityAssessmentId?: string;
  };
  created_at: string;
  updated_at: string;
  rejection_reason?: string;
  rejection_comments?: string;
}

export const useApprovalRequests = () => {
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { trackWorkflowStep } = useWorkflowTracking();

  const fetchRequests = async () => {
    try {
      setLoading(true);
      console.log('Fetching approval requests from Firebase...');
      
      const firebaseQuery = query(collection(db, 'approval_requests'), orderBy('created_at', 'desc'));
      const firebaseSnapshot = await getDocs(firebaseQuery);
      const firebaseRequests = firebaseSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ApprovalRequest[];
      
      console.log('Firebase approval requests:', firebaseRequests.length);
      
      // Only show pending requests
      const pendingRequests = firebaseRequests.filter(req => req.status === 'Pending');
      setRequests(pendingRequests);
    } catch (error) {
      console.error('Error fetching approval requests:', error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const updateRequestStatus = async (
    id: string, 
    status: 'Approved' | 'Rejected',
    rejectionReason?: string,
    rejectionComments?: string
  ) => {
    try {
      console.log('Updating approval request status:', id, status);
      
      const request = requests.find(req => req.id === id);
      if (!request) {
        console.error('Request not found:', id);
        return false;
      }

      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };

      if (status === 'Rejected' && rejectionReason) {
        updateData.rejection_reason = rejectionReason;
        updateData.rejection_comments = rejectionComments || '';
      }

      console.log('Updating Firebase approval request...');
      const firebaseDoc = doc(db, 'approval_requests', id);
      await updateDoc(firebaseDoc, updateData);
      
      console.log('Firebase approval request updated');

      // Track workflow step
      await trackWorkflowStep({
        paymentId: request.details?.paymentId || id,
        qualityAssessmentId: request.details?.qualityAssessmentId,
        fromDepartment: 'Finance',
        toDepartment: 'Operations',
        action: status === 'Approved' ? 'approved' : 'rejected',
        reason: rejectionReason,
        comments: rejectionComments,
        processedBy: 'Operations Manager',
        status: 'completed'
      });

      // If approved and it's a bank transfer, update the payment record
      if (status === 'Approved' && request.type === 'Bank Transfer' && request.details?.paymentId) {
        console.log('Updating payment record status for approved bank transfer...');
        
        try {
          await updateDoc(doc(db, 'payment_records', request.details.paymentId), {
            status: 'Paid',
            method: 'Bank Transfer',
            updated_at: new Date().toISOString()
          });
          console.log('Payment record updated to Paid in Firebase');
        } catch (error) {
          console.error('Error updating payment record:', error);
        }

        // Record daily task
        await addDoc(collection(db, 'daily_tasks'), {
          task_type: 'Payment Approved',
          description: `Bank transfer approved: ${request.details?.supplier} - UGX ${request.details?.amount?.toLocaleString()}`,
          amount: request.details?.amount,
          batch_number: request.details?.batchNumber,
          completed_by: 'Operations Manager',
          completed_at: new Date().toISOString(),
          date: new Date().toISOString().split('T')[0],
          department: 'Finance',
          created_at: new Date().toISOString()
        });
      }

      // If rejected, update payment record status
      if (status === 'Rejected' && request.details?.paymentId) {
        console.log('Updating payment record status for rejected request...');
        
        try {
          await updateDoc(doc(db, 'payment_records', request.details.paymentId), {
            status: 'Rejected',
            updated_at: new Date().toISOString(),
            rejection_reason: rejectionReason,
            rejection_comments: rejectionComments
          });
          console.log('Payment record updated to Rejected in Firebase');
        } catch (error) {
          console.error('Error updating payment record:', error);
        }
      }

      // Remove from local state since it's no longer pending
      setRequests(prev => prev.filter(req => req.id !== id));
      
      return true;
    } catch (error) {
      console.error('Error updating approval request:', error);
      return false;
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  return {
    requests,
    loading,
    updateRequestStatus,
    refetch: fetchRequests,
    fetchRequests
  };
};
