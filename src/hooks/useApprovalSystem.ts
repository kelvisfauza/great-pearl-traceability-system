
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import { useSMSNotifications } from '@/hooks/useSMSNotifications';

export const useApprovalSystem = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { employee } = useAuth();
  const { createApprovalNotification } = useNotifications();
  const { sendApprovalRequestSMS } = useSMSNotifications();

  const createApprovalRequest = async (
    type: string,
    title: string,
    description: string,
    amount: number,
    details: any
  ) => {
    try {
      setLoading(true);
      
      const requestDoc = {
        type,
        title,
        description,
        amount: amount,
        department: details.department || 'Finance',
        requestedby: employee?.email || 'Unknown User',
        daterequested: new Date().toLocaleDateString(),
        priority: details.priority || 'High',
        status: 'Pending',
        details: JSON.stringify(details), // Stringify details for Supabase
      };

      const { data, error } = await supabase
        .from('approval_requests')
        .insert(requestDoc)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Create notification for administrators - wrap in try-catch to prevent blocking
      try {
        await createApprovalNotification({
          id: data.id,
          title,
          amount: amount.toString(),
          requestedBy: employee?.name || 'Unknown User',
          department: details.department || 'Finance',
          priority: details.priority || 'High'
        });
      } catch (notificationError) {
        console.error('Error creating notification (non-blocking):', notificationError);
        // Don't fail the entire request if notification fails
      }

      // Send SMS to finance and admin users
      try {
        console.log('Fetching approvers for SMS notification...');
        
        // Fetch all active employees with phones, then filter in JavaScript for better reliability
        const { data: allEmployees, error: approversError } = await supabase
          .from('employees')
          .select('name, phone, role, department')
          .eq('status', 'Active')
          .not('phone', 'is', null);

        // Filter for admins or finance/admin department users
        const approvers = allEmployees?.filter(emp => 
          ['Administrator', 'Super Admin'].includes(emp.role) || 
          ['Finance', 'Admin'].includes(emp.department)
        );

        console.log('All active employees with phones:', allEmployees?.length || 0);
        console.log('Filtered approvers:', approvers?.length || 0, approvers);

        if (approversError) {
          console.error('Error fetching approvers:', approversError);
        } else if (approvers && approvers.length > 0) {
          const senderName = employee?.name || 'Unknown User';
          console.log('Sending SMS to approvers from:', senderName);
          
          // Send SMS to all relevant approvers
          for (const approver of approvers) {
            if (approver.phone) {
              console.log(`Sending SMS to ${approver.name} at ${approver.phone}`);
              await sendApprovalRequestSMS(
                approver.name,
                approver.phone,
                amount,
                senderName,
                type
              );
            }
          }
        } else {
          console.log('No approvers found with phone numbers');
        }
      } catch (smsError) {
        console.error('Error sending SMS notifications (non-blocking):', smsError);
        // Don't fail the whole request if SMS fails
      }

      toast({
        title: "Approval Request Created",
        description: "Request has been submitted for admin approval"
      });

      return true;
    } catch (error) {
      console.error('Error creating approval request:', error);
      toast({
        title: "Error",
        description: "Failed to create approval request",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    createApprovalRequest,
    loading
  };
};
