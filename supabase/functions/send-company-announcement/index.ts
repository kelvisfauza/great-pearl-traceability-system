import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnnouncementRequest {
  announcementId: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { announcementId }: AnnouncementRequest = await req.json();

    console.log('Processing announcement:', announcementId);

    // Get the announcement details
    const { data: announcement, error: announcementError } = await supabase
      .from('announcements')
      .select('*')
      .eq('id', announcementId)
      .single();

    if (announcementError || !announcement) {
      throw new Error(`Failed to fetch announcement: ${announcementError?.message}`);
    }

    // Get all active employees
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('id, name, email, phone, department, role')
      .eq('status', 'Active');

    if (employeesError) {
      throw new Error(`Failed to fetch employees: ${employeesError.message}`);
    }

    // Filter employees based on target departments and roles
    let targetEmployees = employees || [];

    if (announcement.target_departments && announcement.target_departments.length > 0) {
      targetEmployees = targetEmployees.filter(emp => 
        announcement.target_departments.includes(emp.department)
      );
    }

    if (announcement.target_roles && announcement.target_roles.length > 0) {
      targetEmployees = targetEmployees.filter(emp => 
        announcement.target_roles.includes(emp.role)
      );
    }

    console.log(`Sending announcement to ${targetEmployees.length} employees`);

    let smsSuccessCount = 0;
    let notificationSuccessCount = 0;

    // Send notifications to each employee
    for (const employee of targetEmployees) {
      try {
        // Skip creating in-app notifications here - they're handled by the frontend
        // Just track successful processing
        notificationSuccessCount++;

        // Send SMS if requested and employee has phone number
        if (announcement.send_sms && employee.phone) {
          try {
            const smsMessage = `${announcement.title}: ${announcement.message} - Great Agro Coffee Management`;
            
            // Format phone number
            let formattedPhone = employee.phone.toString().trim();
            if (!formattedPhone.startsWith('+')) {
              if (formattedPhone.startsWith('0')) {
                formattedPhone = '+256' + formattedPhone.substring(1);
              } else if (formattedPhone.startsWith('256')) {
                formattedPhone = '+' + formattedPhone;
              } else {
                formattedPhone = '+256' + formattedPhone;
              }
            }

            // Send SMS directly via YoolaSMS API (avoids auth issues with edge-to-edge calls)
            const apiKey = Deno.env.get('YOOLA_SMS_API_KEY');
            if (apiKey) {
              const smsResponse = await fetch('https://yoolasms.com/api/v1/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: formattedPhone, message: smsMessage, api_key: apiKey })
              });

              if (smsResponse.ok) {
                smsSuccessCount++;
                console.log(`SMS sent successfully to ${formattedPhone}`);
                
                // Log to sms_logs
                await supabase.from('sms_logs').insert({
                  recipient_phone: formattedPhone,
                  recipient_name: employee.name,
                  recipient_email: employee.email,
                  message_content: smsMessage,
                  message_type: 'announcement',
                  status: 'sent',
                  provider: 'YoolaSMS',
                  credits_used: 1,
                  department: employee.department,
                  triggered_by: announcement.created_by
                });
              } else {
                const errText = await smsResponse.text();
                console.error(`SMS failed for ${formattedPhone}:`, errText);
                
                await supabase.from('sms_logs').insert({
                  recipient_phone: formattedPhone,
                  recipient_name: employee.name,
                  message_content: smsMessage,
                  message_type: 'announcement',
                  status: 'failed',
                  provider: 'YoolaSMS',
                  failure_reason: errText,
                  triggered_by: announcement.created_by
                });
              }
            } else {
              console.error('YOOLA_SMS_API_KEY not configured');
            }
          } catch (smsError) {
            console.error(`SMS error for ${employee.phone}:`, smsError);
          }
        }
      } catch (error) {
        console.error(`Error processing employee ${employee.email}:`, error);
      }
    }

    // Update announcement status
    const { error: updateError } = await supabase
      .from('announcements')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        recipients_count: notificationSuccessCount,
        sms_sent_count: smsSuccessCount
      })
      .eq('id', announcementId);

    if (updateError) {
      console.error('Failed to update announcement status:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Announcement sent successfully',
        stats: {
          totalEmployees: targetEmployees.length,
          notificationsSent: notificationSuccessCount,
          smsSent: smsSuccessCount
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in send-company-announcement:', error);
    return new Response(
      JSON.stringify({ 
        error: (error as Error).message,
        success: false 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});