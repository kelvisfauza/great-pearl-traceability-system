
import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, doc, updateDoc } from 'firebase/firestore';
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
      
      // Update in Firebase
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
