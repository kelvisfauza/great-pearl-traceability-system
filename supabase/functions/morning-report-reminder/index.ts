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

    console.log(`Morning report reminder check - EAT time: ${eatTime.toISOString()}, Hour: ${eatHour}`);

    // Only run between 7 AM and 10 AM EAT (07:00 - 10:00)
    if (eatHour < 7 || eatHour >= 10) {
      console.log('Outside morning reminder window (7-10 AM EAT), skipping');
      return new Response(
        JSON.stringify({ message: 'Outside morning reminder window', eatHour }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for YESTERDAY's missed reports
    const yesterday = new Date(eatTime);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayDate = yesterday.toISOString().split('T')[0];
    
    console.log(`Checking for missing reports from yesterday: ${yesterdayDate}`);

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

    // Get yesterday's reports
    const { data: existingReports, error: reportError } = await supabase
      .from('employee_daily_reports')
      .select('employee_id')
      .eq('report_date', yesterdayDate);

    if (reportError) {
      console.error('Error fetching reports:', reportError);
      throw reportError;
    }

    const reportedEmployeeIds = new Set(existingReports?.map(r => r.employee_id) || []);

    // Find employees without reports from yesterday
    const employeesWithoutReports = employees.filter(emp => !reportedEmployeeIds.has(emp.id));

    console.log(`Found ${employeesWithoutReports.length} employees who missed yesterday's report`);

    // Send SMS reminders to employees without yesterday's reports
    let smsCount = 0;
    for (const emp of employeesWithoutReports) {
      if (!emp.phone) {
        console.log(`No phone number for ${emp.name}, skipping SMS`);
        continue;
      }

      const message = `Good morning ${emp.name}! You missed submitting your daily report for ${yesterdayDate}. Please submit it now at www.greatpearlcoffeesystem.site → "Daily Reports" → "New Report". - Great Pearl Coffee`;

      try {
        // Send SMS
        const smsResponse = await supabase.functions.invoke('send-sms', {
          body: {
            phone: emp.phone,
            message: message,
            employee_name: emp.name,
            notification_type: 'missed_report_reminder'
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
          title: 'Missed Daily Report',
          message: `You missed submitting your daily report for ${yesterdayDate}. Please submit it as soon as possible.`,
          type: 'missed_report_reminder',
          priority: 'high',
          target_user_email: emp.email,
          metadata: { report_date: yesterdayDate, department: emp.department }
        });

      } catch (smsError) {
        console.error(`Error sending reminder to ${emp.name}:`, smsError);
      }
    }

    const result = {
      success: true,
      checkingDate: yesterdayDate,
      totalEmployees: employees.length,
      employeesWithReports: reportedEmployeeIds.size,
      employeesWithoutReports: employeesWithoutReports.length,
      smsSent: smsCount
    };

    console.log('Morning report reminder completed:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Morning report reminder error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
