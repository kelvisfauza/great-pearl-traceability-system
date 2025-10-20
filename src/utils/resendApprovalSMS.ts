import { supabase } from '@/integrations/supabase/client';

export const resendApprovalSMS = async (requestId: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('resend-approval-sms', {
      body: { requestId }
    });

    if (error) {
      console.error('❌ Error sending SMS:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ SMS sent successfully:', data);
    return data;
  } catch (error) {
    console.error('❌ Failed to send SMS:', error);
    return { success: false, error: error.message };
  }
};

// Immediately send SMS for Shafik's request
resendApprovalSMS('9a0abbcb-eaa6-415a-9139-d2239a9d690e').then(result => {
  console.log('📧 SMS Notification Result:', result);
});
