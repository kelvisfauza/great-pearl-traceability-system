
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
      let smsSent = 0;
      let smsFailed = 0;
      try {
        console.log('📧 Fetching approvers for SMS notification...');
        
        // Fetch all active employees with phones, then filter in JavaScript for better reliability
        const { data: allEmployees, error: approversError } = await supabase
          .from('employees')
          .select('name, email, phone, role, department')
          .eq('status', 'Active')
          .not('phone', 'is', null);

        if (approversError) {
          console.error('❌ Error fetching approvers:', approversError);
          throw new Error(`Failed to fetch approvers: ${approversError.message}`);
        }

        // Filter for admins or finance/admin department users
        const approvers = allEmployees?.filter(emp => 
          ['Administrator', 'Super Admin'].includes(emp.role) || 
          ['Finance', 'Admin'].includes(emp.department)
        );

        console.log('👥 All active employees with phones:', allEmployees?.length || 0);
        console.log('✅ Filtered approvers:', approvers?.length || 0);
        console.log('📋 Approver list:', approvers?.map(a => ({ name: a.name, role: a.role, dept: a.department, phone: a.phone })));

        if (!approvers || approvers.length === 0) {
          const errorMsg = 'No approvers found with phone numbers';
          console.error('❌', errorMsg);
          toast({
            title: "Warning",
            description: "Request created but no approvers were notified (no phone numbers found)",
            variant: "destructive"
          });
        } else {
          const senderName = employee?.name || 'Unknown User';
          console.log('📤 Sending SMS to approvers from:', senderName);
          
          // Send SMS to all relevant approvers
          for (const approver of approvers) {
            if (approver.phone) {
              try {
                console.log(`📱 Sending SMS to ${approver.name} (${approver.email}) at ${approver.phone}`);
                const smsSuccess = await sendApprovalRequestSMS(
                  approver.name,
                  approver.phone,
                  amount,
                  senderName,
                  type
                );
                if (smsSuccess) {
                  smsSent++;
                  console.log(`✅ SMS sent successfully to ${approver.name}`);
                } else {
                  smsFailed++;
                  console.log(`⚠️ SMS failed to ${approver.name}`);
                }
              } catch (individualSmsError) {
                smsFailed++;
                console.error(`❌ Error sending SMS to ${approver.name}:`, individualSmsError);
              }
            }
          }

          // Show summary toast
          if (smsSent > 0) {
            console.log(`✅ Successfully sent ${smsSent} SMS notification(s)`);
          }
          if (smsFailed > 0) {
            console.log(`⚠️ Failed to send ${smsFailed} SMS notification(s)`);
            toast({
              title: "Partial SMS Failure",
              description: `Request created but ${smsFailed} SMS notification(s) failed to send`,
              variant: "destructive"
            });
          }
        }
      } catch (smsError) {
        console.error('❌ Critical error sending SMS notifications:', smsError);
        toast({
          title: "SMS Notification Failed",
          description: `Request created but approvers were not notified via SMS: ${smsError.message}`,
          variant: "destructive"
        });
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
