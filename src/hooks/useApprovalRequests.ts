
import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, doc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { supabase } from '@/integrations/supabase/client';

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
      
      // Fetch from Firebase first (primary source for finance requests)
      const firebaseQuery = query(collection(db, 'approval_requests'), orderBy('created_at', 'desc'));
      const firebaseSnapshot = await getDocs(firebaseQuery);
      const firebaseRequests = firebaseSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ApprovalRequest[];
      
      console.log('Firebase approval requests:', firebaseRequests.length);

      // Also fetch from Supabase as backup
      const { data: supabaseData, error } = await supabase
        .from('approval_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching from Supabase:', error);
      }

      console.log('Supabase approval requests:', supabaseData?.length || 0);

      // Combine and deduplicate requests (Firebase takes priority)
      const allRequests = [...firebaseRequests];
      
      // Add Supabase requests that don't exist in Firebase
      if (supabaseData) {
        supabaseData.forEach(supabaseRequest => {
          const existsInFirebase = firebaseRequests.some(fbReq => 
            fbReq.title === supabaseRequest.title && 
            fbReq.amount === supabaseRequest.amount &&
            fbReq.requestedby === supabaseRequest.requestedby
          );
          
          if (!existsInFirebase) {
            allRequests.push(supabaseRequest as ApprovalRequest);
          }
        });
      }

      console.log('Total approval requests after combining:', allRequests.length);
      setRequests(allRequests);
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
      
      // Find the request to get its details
      const request = requests.find(req => req.id === id);
      if (!request) {
        console.error('Request not found:', id);
        return false;
      }

      // Update in Firebase
      console.log('Updating Firebase approval request...');
      const firebaseDoc = doc(db, 'approval_requests', id);
      await updateDoc(firebaseDoc, {
        status,
        updated_at: new Date().toISOString()
      });
      
      console.log('Firebase approval request updated');

      // Update in Supabase
      const { error } = await supabase
        .from('approval_requests')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        console.error('Error updating in Supabase:', error);
      } else {
        console.log('Supabase approval request updated');
      }

      // If approved and it's a bank transfer, update the payment record
      if (status === 'Approved' && request.type === 'Bank Transfer' && request.details?.paymentId) {
        console.log('Updating payment record status for approved bank transfer...');
        
        // Update payment record in Firebase
        const paymentQuery = query(collection(db, 'payment_records'));
        const paymentSnapshot = await getDocs(paymentQuery);
        const paymentDoc = paymentSnapshot.docs.find(doc => 
          doc.data().supplier === request.details.supplier &&
          doc.data().amount === request.details.amount
        );
        
        if (paymentDoc) {
          await updateDoc(doc(db, 'payment_records', paymentDoc.id), {
            status: 'Paid',
            method: 'Bank Transfer',
            updated_at: new Date().toISOString()
          });
          console.log('Payment record updated to Paid in Firebase');
        }

        // Update payment record in Supabase
        const { error: paymentError } = await supabase
          .from('payment_records')
          .update({ 
            status: 'Paid',
            method: 'Bank Transfer',
            updated_at: new Date().toISOString()
          })
          .eq('supplier', request.details.supplier)
          .eq('amount', request.details.amount);

        if (paymentError) {
          console.error('Error updating payment record in Supabase:', paymentError);
        } else {
          console.log('Payment record updated to Paid in Supabase');
        }

        // Record daily task
        await addDoc(collection(db, 'daily_tasks'), {
          task_type: 'Payment Approved',
          description: `Bank transfer approved: ${request.details.supplier} - UGX ${request.details.amount.toLocaleString()}`,
          amount: request.details.amount,
          batch_number: request.details.batchNumber,
          completed_by: 'Operations Manager',
          completed_at: new Date().toISOString(),
          date: new Date().toISOString().split('T')[0],
          department: 'Finance',
          created_at: new Date().toISOString()
        });
      }

      // Update local state
      setRequests(prev => 
        prev.map(req => 
          req.id === id ? { ...req, status } : req
        )
      );
      
      return true;
    } catch (error) {
      console.error('Error updating approval request:', error);
      return false;
    }
  };

  useEffect(() => {
    console.log('useApprovalRequests: Starting to fetch approval requests');
    fetchRequests();
    
    // Set up interval to refresh requests every 30 seconds
    const interval = setInterval(fetchRequests, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    requests,
    loading,
    fetchRequests,
    updateRequestStatus
  };
};
