import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();
    
    console.log('🔐 Password reset requested for:', email);
    
    // Create admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    
    // Get employee data
    const { data: employee, error: employeeError } = await supabaseAdmin
      .from('employees')
      .select('*')
      .eq('email', email)
      .single();
    
    if (employeeError || !employee) {
      console.error('❌ Employee not found:', email);
      return new Response(
        JSON.stringify({ success: false, error: 'Employee not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }
    
    if (!employee.phone) {
      console.error('❌ No phone number for employee:', email);
      return new Response(
        JSON.stringify({ success: false, error: 'Employee has no phone number on file' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
    
    // Generate temporary password (8 characters, mix of letters and numbers)
    const tempPassword = 'Reset' + Math.random().toString(36).substring(2, 8).toUpperCase();
    
    console.log('🔑 Generated temporary password for:', email);
    
    // Update user password in Supabase Auth
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      employee.auth_user_id,
      {
        password: tempPassword,
        email_confirm: true
      }
    );
    
    if (updateError) {
      console.error('❌ Error updating password:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to reset password' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }
    
    // Send SMS with temporary password
    const smsMessage = `Your temporary password is: ${tempPassword}\n\nPlease delete this message for security.\n\n- Great Pearl Coffee IT Department`;
    
    const yedaSmsKey = Deno.env.get('YEDA_SMS_API_KEY');
    
    if (yedaSmsKey) {
      try {
        const smsResponse = await fetch('https://yedapay.globaltechug.com/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${yedaSmsKey}`
          },
          body: JSON.stringify({
            phone: employee.phone,
            message: smsMessage
          })
        });
        
        const smsResult = await smsResponse.json();
        console.log('📱 SMS sent:', smsResult);
        
        if (!smsResponse.ok) {
          console.error('❌ SMS sending failed:', smsResult);
        }
      } catch (smsError) {
        console.error('❌ SMS error:', smsError);
      }
    } else {
      console.warn('⚠️ No SMS API key configured');
    }
    
    // Log the action
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        action: 'password_reset_sent',
        table_name: 'employees',
        record_id: employee.id,
        reason: 'IT department sent password reset via SMS',
        performed_by: 'IT Department',
        department: 'IT',
        record_data: {
          email: employee.email,
          phone: employee.phone,
          temp_password_sent: true
        }
      });
    
    console.log('✅ Password reset completed for:', email);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Temporary password sent via SMS',
        email: employee.email,
        phone: employee.phone,
        temp_password: tempPassword // Only for IT admin to see
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
    
  } catch (error) {
    console.error('❌ Error in send-password-reset-sms:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})