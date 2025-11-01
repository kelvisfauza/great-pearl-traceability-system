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

      // Fetch from approval_requests table
      const { data: approvalData, error: approvalError } = await supabase
        .from('approval_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (approvalError) {
        throw approvalError;
      }

      // Fetch from money_requests table (for salary advances)
      const { data: moneyData, error: moneyError } = await supabase
        .from('money_requests')
        .select('*')
        .in('approval_stage', ['pending_finance', 'finance_approved'])
        .order('created_at', { ascending: false });

      if (moneyError) {
        throw moneyError;
      }

      console.log('Raw data from approval_requests:', approvalData);
      console.log('Raw data from money_requests:', moneyData);

      // Map approval_requests data
      const approvalRequests: ExpenseRequest[] = approvalData.map((request: any) => ({
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

      // Map money_requests data (salary advances)
      const moneyRequests: ExpenseRequest[] = moneyData.map((request: any) => ({
        id: request.id,
        type: request.request_type || 'Salary Advance',
        title: request.request_type || 'Salary Advance',
        description: request.reason || '',
        amount: parseFloat(request.amount) || 0,
        requestedby: request.requested_by || '',
        daterequested: request.created_at,
        priority: 'High',
        status: request.status,
        details: { source: 'money_requests', approval_stage: request.approval_stage },
        financeApproved: request.approval_stage === 'finance_approved',
        adminApproved: !!request.admin_approved_at,
        financeApprovedAt: request.finance_approved_at,
        adminApprovedAt: request.admin_approved_at,
        financeApprovedBy: request.finance_approved_by,
        adminApprovedBy: request.admin_approved_by,
        requiresThreeApprovals: false,
        adminApproved1: false,
        adminApproved1At: undefined,
        adminApproved1By: undefined,
        adminApproved2: false,
        adminApproved2At: undefined,
        adminApproved2By: undefined,
        created_at: request.created_at,
        updated_at: request.updated_at || request.created_at
      }));

      // Combine both arrays
      const allRequests = [...approvalRequests, ...moneyRequests];

      console.log('Combined expense requests:', allRequests.length);

      setExpenseRequests(allRequests);
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
    approvalType: 'finance' | 'admin' | 'admin1' | 'admin2', 
    approved: boolean,
    approvedBy: string,
    rejectionReason?: string
  ) => {
    try {
      console.log(`Updating ${approvalType} approval for request ${requestId}:`, approved);

      // First check if it's in approval_requests table
      const { data: approvalRequest } = await supabase
        .from('approval_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      // If not found, check money_requests table
      const { data: moneyRequest } = await supabase
        .from('money_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      const currentRequest = approvalRequest || moneyRequest;
      const isMoneyRequest = !approvalRequest && !!moneyRequest;

      if (!currentRequest) {
        toast({
          title: "Error",
          description: "Request not found",
          variant: "destructive"
        });
        return false;
      }

      // Handle money_requests table (salary advances)
      if (isMoneyRequest) {
        console.log('💰 Processing money_request approval:', { requestId, approvalType, approved, approvedBy });
        
        const updateData: any = {};
        
        if (approved && approvalType === 'finance') {
          updateData.finance_approved_at = new Date().toISOString();
          updateData.finance_approved_by = approvedBy;
          updateData.approval_stage = 'finance_approved';
          updateData.status = 'pending';
          
          console.log('💰 Update data for finance approval:', updateData);
        } else if (!approved) {
          updateData.status = 'rejected';
          updateData.rejection_reason = rejectionReason || 'No reason provided';
          
          console.log('💰 Update data for rejection:', updateData);
        }

        console.log('💰 Executing update on money_requests table...');
        const { data, error } = await supabase
          .from('money_requests')
          .update(updateData)
          .eq('id', requestId)
          .select();

        if (error) {
          console.error('💰 Error updating money_request:', error);
          throw error;
        }

        console.log('💰 Money request updated successfully:', data);

        toast({
          title: "Success",
          description: `Request ${approved ? 'approved and sent to Admin' : 'rejected'} successfully`
        });

        await fetchExpenseRequests();
        return true;
      }

      // Check if request requires three approvals (only for approval_requests)
      const requiresThree = !isMoneyRequest && approvalRequest ? approvalRequest.requires_three_approvals : false;
      
      // Enforce approval order (only for approval_requests)
      if (!isMoneyRequest && approvalRequest) {
        if (approvalType === 'admin1' && approved && !approvalRequest.finance_approved_at) {
          toast({
            title: "Approval Not Allowed",
            description: "Request must be approved by Finance first",
            variant: "destructive"
          });
          return false;
        }
        
        if (approvalType === 'admin2' && approved && (!approvalRequest.finance_approved_at || !approvalRequest.admin_approved_1_at)) {
          toast({
            title: "Approval Not Allowed",
            description: "Request must be approved by Finance and first Admin",
            variant: "destructive"
          });
          return false;
        }
        
        // Legacy admin approval
        if (approvalType === 'admin' && approved && !approvalRequest.finance_approved_at) {
          toast({
            title: "Approval Not Allowed",
            description: "Request must be approved by Finance first",
            variant: "destructive"
          });
          return false;
        }
      }

      const updateData: any = {};
      
      if (approved) {
        // Approval logic
        if (approvalType === 'finance') {
          updateData.finance_approved = true;
          updateData.finance_approved_at = new Date().toISOString();
          updateData.finance_approved_by = approvedBy;
          updateData.status = 'Finance Approved';
        } else if (approvalType === 'admin1') {
          updateData.admin_approved_1 = true;
          updateData.admin_approved_1_at = new Date().toISOString();
          updateData.admin_approved_1_by = approvedBy;
          updateData.status = 'Admin 1 Approved';
        } else if (approvalType === 'admin2') {
          updateData.admin_approved_2 = true;
          updateData.admin_approved_2_at = new Date().toISOString();
          updateData.admin_approved_2_by = approvedBy;
          // Status will be set to Approved by trigger if all approvals are complete
        } else {
          // Legacy admin approval
          updateData.admin_approved = true;
          updateData.admin_approved_at = new Date().toISOString();
          updateData.admin_approved_by = approvedBy;
          // Status will be set to Approved by trigger if all approvals are complete
        }
      } else {
        // Rejection logic - only set rejection fields, don't modify approval timestamps
        updateData.status = 'Rejected';
        updateData.rejection_reason = rejectionReason || 'No reason provided';
        updateData.rejected_at = new Date().toISOString();
        updateData.rejected_by = approvedBy;
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
          if (approvalType === 'finance') {
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