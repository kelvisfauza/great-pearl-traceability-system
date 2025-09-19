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
        created_at: request.created_at,
        updated_at: request.updated_at
      }));

      console.log('Fetched expense requests:', requests.length);
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
    approvalType: 'finance' | 'admin', 
    approved: boolean,
    approvedBy: string
  ) => {
    try {
      console.log(`Updating ${approvalType} approval for request ${requestId}:`, approved);

      const updateData: any = {};
      if (approvalType === 'finance') {
        updateData.finance_approved = approved;
        updateData.finance_approved_at = approved ? new Date().toISOString() : null;
        updateData.finance_approved_by = approved ? approvedBy : null;
      } else {
        updateData.admin_approved = approved;
        updateData.admin_approved_at = approved ? new Date().toISOString() : null;
        updateData.admin_approved_by = approved ? approvedBy : null;
      }

      const { data, error } = await supabase
        .from('approval_requests')
        .update(updateData)
        .eq('id', requestId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Update local state
      setExpenseRequests(prev => prev.map(req => {
        if (req.id === requestId) {
          const updatedReq = { ...req };
          if (approvalType === 'finance') {
            updatedReq.financeApproved = approved;
            updatedReq.financeApprovedAt = approved ? new Date().toISOString() : undefined;
            updatedReq.financeApprovedBy = approved ? approvedBy : undefined;
          } else {
            updatedReq.adminApproved = approved;
            updatedReq.adminApprovedAt = approved ? new Date().toISOString() : undefined;
            updatedReq.adminApprovedBy = approved ? approvedBy : undefined;
          }

          // Check if both approvals are complete for salary requests
          if (updatedReq.type === 'Employee Salary Request' && 
              updatedReq.financeApproved && updatedReq.adminApproved) {
            updatedReq.status = 'Approved';
            
            // Send SMS notification for salary approval
            const details = updatedReq.details;
            if (details.employee_name && details.employee_phone) {
              sendSalaryApprovalSMS(
                details.employee_name,
                details.employee_phone,
                updatedReq.amount
              );
            }
          }

          return updatedReq;
        }
        return req;
      }));

      // Update overall status if both approvals are complete
      const updatedData = data as any;
      if (updatedData.finance_approved && updatedData.admin_approved) {
        await supabase
          .from('approval_requests')
          .update({ status: 'Approved' })
          .eq('id', requestId);
      }

      toast({
        title: "Success",
        description: `Request ${approved ? 'approved' : 'rejected'} successfully`
      });

      return true;
    } catch (error) {
      console.error('Error updating request approval:', error);
      toast({
        title: "Error",
        description: "Failed to update request approval",
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