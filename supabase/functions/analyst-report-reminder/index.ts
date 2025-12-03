import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get today's date
    const today = new Date().toISOString().split('T')[0];
    
    // Get current hour in EAT (UTC+3)
    const now = new Date();
    const eatHour = (now.getUTCHours() + 3) % 24;
    
    console.log(`Current EAT hour: ${eatHour}, checking for date: ${today}`);

    // Only run after 7pm EAT (19:00)
    if (eatHour < 19) {
      return new Response(
        JSON.stringify({ message: "Not yet 7pm EAT, skipping reminder" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if market report exists for today
    const { data: existingReport, error: reportError } = await supabase
      .from('market_reports')
      .select('id')
      .eq('report_date', today)
      .limit(1);

    if (reportError) {
      throw reportError;
    }

    if (existingReport && existingReport.length > 0) {
      console.log('Report already exists for today, no reminder needed');
      return new Response(
        JSON.stringify({ message: "Report already exists for today" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get data analyst employees (Denis or anyone with Data Analysis permission)
    const { data: analysts, error: employeeError } = await supabase
      .from('employees')
      .select('id, name, email, phone')
      .or('department.eq.Data Analysis,permissions.cs.{Data Analysis}')
      .eq('status', 'Active');

    if (employeeError) {
      throw employeeError;
    }

    if (!analysts || analysts.length === 0) {
      console.log('No data analysts found');
      return new Response(
        JSON.stringify({ message: "No data analysts found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${analysts.length} data analyst(s) to notify`);

    // Send SMS reminders to each analyst
    const smsResults = [];
    for (const analyst of analysts) {
      if (analyst.phone) {
        const message = `Dear ${analyst.name}, please update the system by creating the daily market report for ${new Date().toLocaleDateString('en-UG', { weekday: 'long', month: 'short', day: 'numeric' })}. The team needs this report for tomorrow's planning. - Great Pearl Coffee`;
        
        try {
          // Call send-sms function
          const { data: smsResponse, error: smsError } = await supabase.functions.invoke('send-sms', {
            body: {
              to: analyst.phone,
              message: message
            }
          });

          if (smsError) {
            console.error(`SMS error for ${analyst.name}:`, smsError);
            smsResults.push({ analyst: analyst.name, success: false, error: smsError.message });
          } else {
            console.log(`SMS sent to ${analyst.name}`);
            smsResults.push({ analyst: analyst.name, success: true });
          }
        } catch (smsErr) {
          console.error(`SMS exception for ${analyst.name}:`, smsErr);
          smsResults.push({ analyst: analyst.name, success: false, error: String(smsErr) });
        }
      }
    }

    // Create a notification record
    for (const analyst of analysts) {
      await supabase.from('finance_notifications').insert({
        title: 'Daily Market Report Reminder',
        message: `Dear ${analyst.name}, please create today's (${today}) market report. The team needs this report for tomorrow's planning.`,
        type: 'report_reminder',
        priority: 'high',
        target_user_email: analyst.email,
        sender_name: 'System',
        metadata: { report_date: today }
      });
    }

    return new Response(
      JSON.stringify({ 
        message: "Reminders sent successfully",
        analysts: analysts.map(a => a.name),
        smsResults,
        date: today
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in analyst-report-reminder:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
