
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ApprovalRequest {
  id: string;
  department: string;
  type: string;
  title: string;
  description: string;
  amount: string;
  requestedBy: string;
  dateRequested: string;
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
      const { data, error } = await supabase
        .from('approval_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching approval requests:', error);
        setRequests([]);
        return;
      }

      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching approval requests:', error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const updateRequestStatus = async (id: string, status: 'Approved' | 'Rejected') => {
    try {
      const { error } = await supabase
        .from('approval_requests')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        console.error('Error updating approval request:', error);
        return false;
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
    fetchRequests();
  }, []);

  return {
    requests,
    loading,
    fetchRequests,
    updateRequestStatus
  };
};
