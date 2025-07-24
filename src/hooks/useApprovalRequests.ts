import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
      console.log('Fetching approval requests...');
      
      // Mock data since approval_requests table doesn't exist yet
      const mockRequests: ApprovalRequest[] = [];
      
      console.log('Approval requests loaded:', mockRequests.length);
      
      // Only show pending requests
      const pendingRequests = mockRequests.filter(req => req.status === 'Pending');
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

      // Mock status update
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