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
        // Create in-app notification
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert({
            title: announcement.title,
            message: announcement.message,
            type: 'announcement',
            priority: announcement.priority,
            target_user_id: employee.id,
            target_department: employee.department,
            target_role: employee.role,
            is_read: false
          });

        if (!notificationError) {
          notificationSuccessCount++;
        } else {
          console.error(`Failed to create notification for ${employee.email}:`, notificationError);
        }

        // Send SMS if requested and employee has phone number
        if (announcement.send_sms && employee.phone) {
          try {
            const smsMessage = `${announcement.title}\n\n${announcement.message}\n\n- FarmFlow Management`;
            
            const smsResponse = await fetch('https://sms.yoola.net/api/send-sms/', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('YOOLA_SMS_API_KEY')}`,
              },
              body: JSON.stringify({
                recipient: employee.phone,
                sender: 'FarmFlow',
                message: smsMessage,
              }),
            });

            if (smsResponse.ok) {
              smsSuccessCount++;
              console.log(`SMS sent successfully to ${employee.phone}`);
            } else {
              const errorText = await smsResponse.text();
              console.error(`SMS failed for ${employee.phone}:`, errorText);
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