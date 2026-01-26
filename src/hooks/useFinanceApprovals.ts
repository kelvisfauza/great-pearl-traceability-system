import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useSMSNotifications } from '@/hooks/useSMSNotifications';

interface FinanceApprovalRequest {
  id: string;
  type: string;
  title: string;
  description: string;
  amount: number;
  department: string;
  requestedby: string;
  requestedby_name: string | null;
  daterequested: string;
  priority: string;
  status: string;
  admin_approved_by: string | null;
  admin_approved_at: string | null;
  finance_approved: boolean | null;
  finance_approved_by: string | null;
  finance_approved_at: string | null;
  details: any;
  created_at: string;
}

export const useFinanceApprovals = () => {
  const [requests, setRequests] = useState<FinanceApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { employee } = useAuth();
  const { sendApprovalRequestSMS } = useSMSNotifications();

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('approval_requests')
        .select('*')
        .eq('admin_approved', true)
        .is('finance_approved', null)
        .eq('status', 'Pending Finance')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setRequests(data || []);
    } catch (error: any) {
      console.error('Error fetching finance approval requests:', error);
      toast({
        title: "Error",
        description: "Failed to fetch approval requests",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();

    // Subscribe to changes
    const channel = supabase
      .channel('finance-approvals-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'approval_requests',
          filter: 'admin_approved=eq.true'
        },
        () => {
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  /**
   * Activates a salary advance after Finance approval
   */
  const activateSalaryAdvance = async (request: FinanceApprovalRequest) => {
    try {
      // Parse the details
      const details = typeof request.details === 'string' 
        ? JSON.parse(request.details) 
        : request.details;

      if (details?.advance_type !== 'salary_advance') {
        console.log('Not a salary advance request, skipping activation');
        return false;
      }

      // Create the actual salary advance record
      const { data: advance, error: advanceError } = await supabase
        .from('employee_salary_advances')
        .insert({
          employee_email: details.employee_email,
          employee_name: details.employee_name,
          original_amount: details.advance_amount,
          remaining_balance: details.advance_amount,
          minimum_payment: details.minimum_payment,
          reason: details.reason,
          created_by: request.requestedby,
          status: 'active'
        })
        .select()
        .single();

      if (advanceError) {
        console.error('Failed to create salary advance:', advanceError);
        return false;
      }

      console.log('✅ Salary advance activated:', advance.id);

      // Send SMS notification to the employee who receives the advance
      try {
        const { data: advanceEmployee } = await supabase
          .from('employees')
          .select('phone, name')
          .eq('email', details.employee_email)
          .single();

        if (advanceEmployee?.phone) {
          const message = `Dear ${advanceEmployee.name}, your salary advance of UGX ${details.advance_amount.toLocaleString()} has been APPROVED and DISBURSED. Minimum monthly payment: UGX ${details.minimum_payment.toLocaleString()}. This will be deducted from your future salary requests. Great Pearl Coffee.`;

          await supabase.functions.invoke('send-sms', {
            body: {
              phone: advanceEmployee.phone,
              message: message,
              userName: advanceEmployee.name,
              messageType: 'approval',
              triggeredBy: 'Salary Advance System',
              department: 'HR',
              recipientEmail: details.employee_email
            }
          });

          console.log('✅ SMS notification sent to advance recipient:', advanceEmployee.name);
        }
      } catch (smsError) {
        console.error('SMS notification error for advance recipient (non-blocking):', smsError);
      }

      return true;
    } catch (error) {
      console.error('Error activating salary advance:', error);
      return false;
    }
  };

  const handleFinanceApproval = async (
    requestId: string,
    approve: boolean,
    rejectionReason?: string,
    rejectionComments?: string
  ) => {
    try {
      const request = requests.find(r => r.id === requestId);
      
      const updateData: any = {
        finance_approved: approve,
        finance_approved_by: employee?.name || employee?.email || 'Finance',
        finance_approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (approve) {
        updateData.status = 'Approved';
      } else {
        updateData.status = 'Rejected';
        updateData.rejection_reason = rejectionReason || 'Rejected by Finance';
        if (rejectionComments) {
          updateData.rejection_comments = rejectionComments;
        }
      }

      const { data, error } = await supabase
        .from('approval_requests')
        .update(updateData)
        .eq('id', requestId)
        .select()
        .single();

      if (error) throw error;

      // If approved and it's a salary advance, activate it
      if (approve && request?.type === 'Salary Advance') {
        await activateSalaryAdvance(data);
      }

      // Send SMS notification to requester (the HR who submitted the advance request)
      try {
        const { data: requesterEmployee } = await supabase
          .from('employees')
          .select('phone, name')
          .eq('email', data.requestedby)
          .single();

        if (requesterEmployee?.phone) {
          const message = approve
            ? `Your ${data.type} request for UGX ${data.amount.toLocaleString()} has been APPROVED by Finance.${data.type === 'Salary Advance' ? ' The employee has been notified and the advance is now active.' : ' You will receive payment shortly.'}`
            : `Your ${data.type} request for UGX ${data.amount.toLocaleString()} has been REJECTED by Finance. Reason: ${rejectionReason}`;

          await sendApprovalRequestSMS(
            requesterEmployee.name,
            requesterEmployee.phone,
            data.amount,
            employee?.name || 'Finance',
            data.type
          );
        }
      } catch (smsError) {
        console.error('SMS notification error (non-blocking):', smsError);
      }

      toast({
        title: approve ? "Request Approved" : "Request Rejected",
        description: `Request has been ${approve ? 'approved' : 'rejected'} successfully${approve && request?.type === 'Salary Advance' ? '. Salary advance has been activated.' : ''}`
      });

      await fetchRequests();
      return true;
    } catch (error: any) {
      console.error('Error processing finance approval:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to process request",
        variant: "destructive"
      });
      return false;
    }
  };

  return {
    requests,
    loading,
    handleFinanceApproval,
    refetch: fetchRequests
  };
};
