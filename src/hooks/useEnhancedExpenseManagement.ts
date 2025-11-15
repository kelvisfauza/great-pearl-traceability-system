import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSMSNotifications } from '@/hooks/useSMSNotifications';

interface ExpenseRequest {
  id: string;
  type: string;
  title: string;
  description: string;
  amount: number;
  requestedby: string;
  daterequested: string;
  priority: string;
  status: string;
  department?: string;
  details: any;
  financeApproved: boolean;
  adminApproved: boolean;
  financeApprovedAt?: string;
  adminApprovedAt?: string;
  financeApprovedBy?: string;
  adminApprovedBy?: string;
  requiresThreeApprovals?: boolean;
  adminApproved1?: boolean;
  adminApproved1At?: string;
  adminApproved1By?: string;
  adminApproved2?: boolean;
  adminApproved2At?: string;
  adminApproved2By?: string;
  created_at: string;
  updated_at: string;
}

export const useEnhancedExpenseManagement = () => {
  const [expenseRequests, setExpenseRequests] = useState<ExpenseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { sendSalaryApprovalSMS } = useSMSNotifications();

  const fetchExpenseRequests = async () => {
    try {
      setLoading(true);
      console.log('Fetching expense requests from Supabase...');

      const { data, error } = await supabase
        .from('approval_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      console.log('Raw data from Supabase:', data);

      const requests: ExpenseRequest[] = data.map((request: any) => ({
        id: request.id,
        type: request.type,
        title: request.title,
        description: request.description,
        amount: parseFloat(request.amount) || 0,
        requestedby: request.requestedby,
        daterequested: request.daterequested,
        priority: request.priority,
        status: request.status,
        details: typeof request.details === 'string' ? JSON.parse(request.details || '{}') : request.details || {},
        financeApproved: request.finance_approved || false,
        adminApproved: request.admin_approved || false,
        financeApprovedAt: request.finance_approved_at,
        adminApprovedAt: request.admin_approved_at,
        financeApprovedBy: request.finance_approved_by,
        adminApprovedBy: request.admin_approved_by,
        requiresThreeApprovals: request.requires_three_approvals || false,
        adminApproved1: request.admin_approved_1 || false,
        adminApproved1At: request.admin_approved_1_at,
        adminApproved1By: request.admin_approved_1_by,
        adminApproved2: request.admin_approved_2 || false,
        adminApproved2At: request.admin_approved_2_at,
        adminApproved2By: request.admin_approved_2_by,
        created_at: request.created_at,
        updated_at: request.updated_at
      }));

      console.log('Processed expense requests with approval status:', requests.map(r => ({
        id: r.id,
        title: r.title,
        status: r.status,
        financeApproved: r.financeApproved,
        adminApproved: r.adminApproved,
        finance_approved_raw: data.find(d => d.id === r.id)?.finance_approved,
        admin_approved_raw: data.find(d => d.id === r.id)?.admin_approved
      })));

      setExpenseRequests(requests);
    } catch (error) {
      console.error('Error fetching expense requests:', error);
      toast({
        title: "Error",
        description: "Failed to fetch expense requests",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateRequestApproval = async (
    requestId: string, 
    approvalType: 'admin' | 'admin1' | 'admin2', 
    approved: boolean,
    approvedBy: string,
    rejectionReason?: string
  ) => {
    try {
      console.log(`[ADMIN APPROVAL] Updating ${approvalType} approval for request ${requestId}:`, approved);

      // First, get the current request to check approval state
      const { data: currentRequest } = await supabase
        .from('approval_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (!currentRequest) {
        toast({
          title: "Error",
          description: "Request not found",
          variant: "destructive"
        });
        return false;
      }

      const updateData: any = {};
      
      if (approved) {
        // ADMIN APPROVAL - First step in main app
        if (approvalType === 'admin') {
          updateData.admin_approved = true;
          updateData.admin_approved_at = new Date().toISOString();
          updateData.admin_approved_by = approvedBy;
          updateData.status = 'Pending Finance'; // ✅ NEW: Admin approved, now waiting for Finance portal
          console.log('✅ Admin approved - status set to Pending Finance');
        } else if (approvalType === 'admin1') {
          updateData.admin_approved_1 = true;
          updateData.admin_approved_1_at = new Date().toISOString();
          updateData.admin_approved_1_by = approvedBy;
          updateData.status = 'Pending Finance';
          console.log('✅ Admin 1 approved - status set to Pending Finance');
        } else if (approvalType === 'admin2') {
          updateData.admin_approved_2 = true;
          updateData.admin_approved_2_at = new Date().toISOString();
          updateData.admin_approved_2_by = approvedBy;
          updateData.status = 'Pending Finance';
          console.log('✅ Admin 2 approved - status set to Pending Finance');
        }
      } else {
        // Rejection logic - only set rejection fields, don't modify approval timestamps
        updateData.status = 'Rejected';
        updateData.rejection_reason = rejectionReason || 'No reason provided';
        updateData.rejected_at = new Date().toISOString();
        updateData.rejected_by = approvedBy;
        console.log('❌ Request rejected by admin');
      }

      console.log('📝 Update data to send:', updateData);

      const { data, error } = await supabase
        .from('approval_requests')
        .update(updateData)
        .eq('id', requestId)
        .select()
        .single();

      if (error) {
        console.error('❌ Database error:', error);
        throw error;
      }
      
      console.log('✅ Update successful:', data);

      // Update local state
      setExpenseRequests(prev => prev.map(req => {
        if (req.id === requestId) {
          const updatedReq = { ...req };
          if (approvalType === 'admin') {
            updatedReq.financeApproved = approved;
            updatedReq.financeApprovedAt = approved ? new Date().toISOString() : undefined;
            updatedReq.financeApprovedBy = approved ? approvedBy : undefined;
          } else if (approvalType === 'admin1') {
            updatedReq.adminApproved1 = approved;
            updatedReq.adminApproved1At = approved ? new Date().toISOString() : undefined;
            updatedReq.adminApproved1By = approved ? approvedBy : undefined;
          } else if (approvalType === 'admin2') {
            updatedReq.adminApproved2 = approved;
            updatedReq.adminApproved2At = approved ? new Date().toISOString() : undefined;
            updatedReq.adminApproved2By = approved ? approvedBy : undefined;
          } else {
            updatedReq.adminApproved = approved;
            updatedReq.adminApprovedAt = approved ? new Date().toISOString() : undefined;
            updatedReq.adminApprovedBy = approved ? approvedBy : undefined;
          }

          return updatedReq;
        }
        return req;
      }));

      // Trigger will handle final status update and wallet credit

      toast({
        title: "Success",
        description: `Request ${approved ? 'approved' : 'rejected'} successfully`
      });

      return true;
    } catch (error) {
      console.error('❌ Error updating request approval:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: (error as any)?.code,
        details: (error as any)?.details,
        hint: (error as any)?.hint
      });
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update request approval",
        variant: "destructive"
      });
      return false;
    }
  };

  useEffect(() => {
    fetchExpenseRequests();
  }, []);

  return {
    expenseRequests,
    loading,
    updateRequestApproval,
    refetch: fetchExpenseRequests
  };
};