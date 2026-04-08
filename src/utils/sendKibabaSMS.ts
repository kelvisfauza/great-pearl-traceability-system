import { supabase } from '@/integrations/supabase/client';

export const sendKibabaSMS = async () => {
  try {
    console.log('🔍 Finding Kibaba\'s most recent approved request...');
    
    // Find Kibaba's most recent approved request
    const { data: requests, error: fetchError } = await supabase
      .from('approval_requests')
      .select('*')
      .eq('requestedby', 'kibaba@farmflow.ug')
      .eq('status', 'Approved')
      .order('updated_at', { ascending: false })
      .limit(1);
    
    if (fetchError) {
      console.error('❌ Error fetching request:', fetchError);
      return { success: false, error: fetchError.message };
    }
    
    if (!requests || requests.length === 0) {
      console.log('⚠️ No approved requests found for Kibaba');
      return { success: false, error: 'No approved requests found' };
    }
    
    const request = requests[0];
    console.log('✅ Found request:', request.id, request.title);
    
    // Get Kibaba's employee details
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('name, phone')
      .eq('email', 'kibaba@farmflow.ug')
      .single();
    
    if (employeeError || !employee) {
      console.error('❌ Error fetching employee:', employeeError);
      return { success: false, error: 'Employee not found' };
    }
    
    console.log('📱 Kibaba\'s phone:', employee.phone);
    
    if (!employee.phone) {
      console.log('⚠️ No phone number found for Kibaba');
      return { success: false, error: 'No phone number' };
    }
    
    // Send SMS
    const message = `Dear ${employee.name}, your ${request.type} "${request.title}" of UGX ${request.amount.toLocaleString()} has been approved and dispersed successfully. Great Agro Coffee.`;
    
    console.log('📤 Sending SMS...');
    const { data: smsData, error: smsError } = await supabase.functions.invoke('send-sms', {
      body: {
        phone: employee.phone,
        message: message,
        userName: employee.name,
        messageType: 'approval',
        triggeredBy: 'Manual SMS Resend',
        requestId: request.id,
        department: request.department,
        recipientEmail: 'kibaba@farmflow.ug'
      }
    });
    
    if (smsError) {
      console.error('❌ Error sending SMS:', smsError);
      return { success: false, error: smsError.message };
    }
    
    console.log('✅ SMS sent successfully:', smsData);
    alert('✅ SMS sent to Kibaba successfully!');
    return { success: true, data: smsData };
    
  } catch (error) {
    console.error('❌ Failed to send SMS:', error);
    return { success: false, error: error.message };
  }
};

// Auto-execution removed - use sendKibabaSMS() manually when needed
