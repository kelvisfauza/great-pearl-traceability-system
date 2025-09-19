import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const useSMSNotifications = () => {
  const { toast } = useToast();

  const sendSalaryApprovalSMS = async (employeeName: string, phoneNumber: string, amount: number) => {
    try {
      console.log('Sending salary approval SMS notification...');
      
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: {
          to: phoneNumber,
          message: `Dear ${employeeName}, your salary request of UGX ${amount.toLocaleString()} has been approved and is pending withdrawal. You will receive it ASAP.`,
          type: 'salary_approval'
        }
      });

      if (error) {
        console.error('Error sending SMS:', error);
        throw error;
      }

      console.log('SMS sent successfully:', data);
      return true;
    } catch (error) {
      console.error('Failed to send SMS notification:', error);
      toast({
        title: "SMS Notification Failed",
        description: "Could not send SMS notification to employee",
        variant: "destructive"
      });
      return false;
    }
  };

  const sendSalaryInitializedSMS = async (
    employeeName: string, 
    phoneNumber: string, 
    amount: number, 
    paymentType: 'mid-month' | 'end-month'
  ) => {
    try {
      console.log('Sending salary initialized SMS notification...');
      
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: {
          to: phoneNumber,
          message: `Dear ${employeeName}, your ${paymentType === 'mid-month' ? 'mid month' : 'end of month'} salary of UGX ${amount.toLocaleString()} has been initialized. Once approved you will receive it ASAP.`,
          type: 'salary_initialized'
        }
      });

      if (error) {
        console.error('Error sending SMS:', error);
        throw error;
      }

      console.log('SMS sent successfully:', data);
      return true;
    } catch (error) {
      console.error('Failed to send SMS notification:', error);
      toast({
        title: "SMS Notification Failed",
        description: "Could not send SMS notification to employee",
        variant: "destructive"
      });
      return false;
    }
  };

  return {
    sendSalaryApprovalSMS,
    sendSalaryInitializedSMS
  };
};