
import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, doc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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
  details?: any;
  created_at: string;
  updated_at: string;
}

export const useApprovalRequests = () => {
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);

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

  const updateRequestStatus = async (id: string, status: 'Approved' | 'Rejected') => {
    try {
      console.log('Updating approval request status:', id, status);
      
      const request = requests.find(req => req.id === id);
      if (!request) {
        console.error('Request not found:', id);
        return false;
      }

      console.log('Updating Firebase approval request...');
      const firebaseDoc = doc(db, 'approval_requests', id);
      await updateDoc(firebaseDoc, {
        status,
        updated_at: new Date().toISOString()
      });
      
      console.log('Firebase approval request updated');

      // If approved and it's a bank transfer, update the payment record
      if (status === 'Approved' && request.type === 'Bank Transfer') {
        console.log('Updating payment record status for approved bank transfer...');
        
        const paymentQuery = query(collection(db, 'payment_records'));
        const paymentSnapshot = await getDocs(paymentQuery);
        const paymentDoc = paymentSnapshot.docs.find(doc => 
          doc.data().supplier === request.details?.supplier &&
          doc.data().amount === request.details?.amount
        );
        
        if (paymentDoc) {
          await updateDoc(doc(db, 'payment_records', paymentDoc.id), {
            status: 'Paid',
            method: 'Bank Transfer',
            updated_at: new Date().toISOString()
          });
          console.log('Payment record updated to Paid in Firebase');
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
    fetchRequests // Add this for compatibility
  };
};
