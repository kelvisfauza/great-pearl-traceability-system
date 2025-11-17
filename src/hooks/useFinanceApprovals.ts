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

  const handleFinanceApproval = async (
    requestId: string,
    approve: boolean,
    rejectionReason?: string,
    rejectionComments?: string
  ) => {
    try {
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

      // Send SMS notification to requester
      try {
        const request = data;
        const { data: requesterEmployee } = await supabase
          .from('employees')
          .select('phone, name')
          .eq('email', request.requestedby)
          .single();

        if (requesterEmployee?.phone) {
          const message = approve
            ? `Your ${request.type} request for UGX ${request.amount.toLocaleString()} has been APPROVED by Finance. You will receive payment shortly.`
            : `Your ${request.type} request for UGX ${request.amount.toLocaleString()} has been REJECTED by Finance. Reason: ${rejectionReason}`;

          await sendApprovalRequestSMS(
            requesterEmployee.name,
            requesterEmployee.phone,
            request.amount,
            employee?.name || 'Finance',
            request.type
          );
        }
      } catch (smsError) {
        console.error('SMS notification error (non-blocking):', smsError);
      }

      toast({
        title: approve ? "Request Approved" : "Request Rejected",
        description: `Request has been ${approve ? 'approved' : 'rejected'} successfully`
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
