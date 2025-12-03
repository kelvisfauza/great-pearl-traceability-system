import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current time in EAT (UTC+3)
    const now = new Date();
    const eatTime = new Date(now.getTime() + (3 * 60 * 60 * 1000));
    const eatHour = eatTime.getUTCHours();

    console.log(`Daily report reminder check - EAT time: ${eatTime.toISOString()}, Hour: ${eatHour}`);

    // Only run between 6 PM and 7 PM EAT (18:00 - 19:00)
    if (eatHour < 18 || eatHour >= 19) {
      console.log('Outside reminder window (6-7 PM EAT), skipping');
      return new Response(
        JSON.stringify({ message: 'Outside reminder window', eatHour }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const today = eatTime.toISOString().split('T')[0];
    console.log(`Checking for missing reports on: ${today}`);

    // Get all active employees
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, name, email, phone, department')
      .eq('status', 'Active')
      .not('disabled', 'eq', true);

    if (empError) {
      console.error('Error fetching employees:', empError);
      throw empError;
    }

    if (!employees || employees.length === 0) {
      console.log('No active employees found');
      return new Response(
        JSON.stringify({ message: 'No active employees found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get today's reports
    const { data: existingReports, error: reportError } = await supabase
      .from('employee_daily_reports')
      .select('employee_id')
      .eq('report_date', today);

    if (reportError) {
      console.error('Error fetching reports:', reportError);
      throw reportError;
    }

    const reportedEmployeeIds = new Set(existingReports?.map(r => r.employee_id) || []);

    // Find employees without reports
    const employeesWithoutReports = employees.filter(emp => !reportedEmployeeIds.has(emp.id));

    console.log(`Found ${employeesWithoutReports.length} employees without reports`);

    // Send SMS reminders to employees without reports
    let smsCount = 0;
    for (const emp of employeesWithoutReports) {
      if (!emp.phone) {
        console.log(`No phone number for ${emp.name}, skipping SMS`);
        continue;
      }

      const message = `Dear ${emp.name}, please submit your daily report for ${today} before 7 PM. Login at www.greatpearlcoffeesystem.site, go to "Daily Reports" and click "New Report". - Great Pearl Coffee`;

      try {
        // Send SMS
        const smsResponse = await supabase.functions.invoke('send-sms', {
          body: {
            phone: emp.phone,
            message: message,
            employee_name: emp.name,
            notification_type: 'daily_report_reminder'
          }
        });

        if (smsResponse.error) {
          console.error(`SMS failed for ${emp.name}:`, smsResponse.error);
        } else {
          console.log(`SMS sent to ${emp.name}`);
          smsCount++;
        }

        // Create in-app notification
        await supabase.from('finance_notifications').insert({
          title: 'Daily Report Reminder',
          message: `Please submit your daily report for ${today} before 7 PM.`,
          type: 'daily_report_reminder',
          priority: 'normal',
          target_user_email: emp.email,
          metadata: { report_date: today, department: emp.department }
        });

      } catch (smsError) {
        console.error(`Error sending reminder to ${emp.name}:`, smsError);
      }
    }

    const result = {
      success: true,
      date: today,
      totalEmployees: employees.length,
      employeesWithReports: reportedEmployeeIds.size,
      employeesWithoutReports: employeesWithoutReports.length,
      smsSent: smsCount
    };

    console.log('Daily report reminder completed:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Daily report reminder error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
