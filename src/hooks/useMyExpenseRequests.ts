import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface MyExpenseRequest {
  id: string;
  type: string;
  title: string;
  description: string;
  amount: string;
  requestedby: string;
  daterequested: string;
  priority: string;
  status: string;
  finance_approved_at?: string | null;
  admin_approved_at?: string | null;
  finance_approved_by?: string | null;
  admin_approved_by?: string | null;
  approval_stage?: string;
  created_at: string;
  updated_at: string;
  rejection_reason?: string | null;
  details?: any;
}

export const useMyExpenseRequests = () => {
  const [requests, setRequests] = useState<MyExpenseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { employee } = useAuth();

  const fetchMyRequests = async () => {
    if (!employee?.email) return;
    
    try {
      setLoading(true);
      
      const { data: myRequests, error } = await supabase
        .from('approval_requests')
        .select('*')
        .eq('type', 'Expense Request')
        .eq('requestedby', employee.email)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching my expense requests:', error);
        return;
      }
      
      setRequests(myRequests || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyRequests();
  }, [employee?.email]);

  const getApprovalStatus = (request: MyExpenseRequest) => {
    if (request.status === 'Rejected') return 'Rejected';
    if (request.status === 'Approved') return 'Fully Approved';
    
    const financeApproved = !!request.finance_approved_at;
    const adminApproved = !!request.admin_approved_at;
    
    if (financeApproved && adminApproved) return 'Fully Approved';
    if (financeApproved && !adminApproved) return 'Finance Approved - Awaiting Admin';
    if (!financeApproved && adminApproved) return 'Admin Approved - Awaiting Finance';
    return 'Pending - Awaiting Finance & Admin';
  };

  const getStatusColor = (request: MyExpenseRequest) => {
    if (request.status === 'Rejected') return 'text-red-600 bg-red-50';
    if (request.status === 'Approved') return 'text-green-600 bg-green-50';
    
    const financeApproved = !!request.finance_approved_at;
    const adminApproved = !!request.admin_approved_at;
    
    if (financeApproved || adminApproved) return 'text-blue-600 bg-blue-50';
    return 'text-yellow-600 bg-yellow-50';
  };

  return {
    requests,
    loading,
    refetch: fetchMyRequests,
    getApprovalStatus,
    getStatusColor
  };
};