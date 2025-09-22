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
            const smsMessage = `${announcement.title}\n\n${announcement.message}\n\n- FarmFlow Management`;
            
            // Use the existing send-sms function instead of direct API call
            const { data: smsResult, error: smsError } = await supabase.functions.invoke('send-sms', {
              body: {
                phone: employee.phone,
                message: smsMessage,
                userName: employee.name,
                messageType: 'announcement',
                department: employee.department,
                recipientEmail: employee.email,
                triggeredBy: announcement.created_by
              }
            });

            if (!smsError && smsResult?.success) {
              smsSuccessCount++;
              console.log(`SMS sent successfully to ${employee.phone}`);
            } else {
              console.error(`SMS failed for ${employee.phone}:`, smsError?.message || 'Unknown error');
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
        error: error.message,
        success: false 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});