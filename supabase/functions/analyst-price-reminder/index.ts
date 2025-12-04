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
    const now = new Date();
    const eatTime = new Date(now.getTime() + (3 * 60 * 60 * 1000));
    const today = eatTime.toISOString().split('T')[0];
    const eatHour = eatTime.getUTCHours();
    
    console.log(`Morning price reminder check - EAT hour: ${eatHour}, date: ${today}`);

    // Only run between 7 AM and 10 AM EAT (morning window)
    if (eatHour < 7 || eatHour >= 10) {
      console.log('Outside morning reminder window (7-10 AM EAT), skipping');
      return new Response(
        JSON.stringify({ message: "Outside morning reminder window", eatHour }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if prices have been set for today in price_history
    const { data: todayPrices, error: priceError } = await supabase
      .from('price_history')
      .select('id, arabica_buying_price, robusta_buying_price')
      .eq('price_date', today)
      .limit(1);

    if (priceError) {
      console.error('Error checking prices:', priceError);
      throw priceError;
    }

    // Check if buying prices are set (not just ICE prices from auto-fetch)
    const pricesSet = todayPrices && todayPrices.length > 0 && 
      (todayPrices[0].arabica_buying_price > 0 || todayPrices[0].robusta_buying_price > 0);

    if (pricesSet) {
      console.log('Prices already set for today, no reminder needed');
      return new Response(
        JSON.stringify({ message: "Prices already set for today", prices: todayPrices[0] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log('Prices not set for today, sending reminder...');

    // Get data analyst employees (Denis or anyone with Data Analysis permission)
    const { data: analysts, error: employeeError } = await supabase
      .from('employees')
      .select('id, name, email, phone')
      .or('department.eq.Data Analysis,permissions.cs.{Data Analysis}')
      .eq('status', 'Active')
      .not('disabled', 'eq', true);

    if (employeeError) {
      console.error('Error fetching analysts:', employeeError);
      throw employeeError;
    }

    if (!analysts || analysts.length === 0) {
      console.log('No data analysts found');
      return new Response(
        JSON.stringify({ message: "No data analysts found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${analysts.length} data analyst(s) to notify about prices`);

    // Send SMS reminders to each analyst
    const smsResults = [];
    for (const analyst of analysts) {
      if (analyst.phone) {
        const message = `Good morning ${analyst.name}! Please update today's coffee buying prices on the system. Login at www.greatpearlcoffeesystem.site, go to "Data Analyst" → "Set Prices" to update Arabica and Robusta prices. - Great Pearl Coffee`;
        
        try {
          const { data: smsResponse, error: smsError } = await supabase.functions.invoke('send-sms', {
            body: {
              phone: analyst.phone,
              message: message,
              employee_name: analyst.name,
              notification_type: 'price_reminder'
            }
          });

          if (smsError) {
            console.error(`SMS error for ${analyst.name}:`, smsError);
            smsResults.push({ analyst: analyst.name, success: false, error: smsError.message });
          } else {
            console.log(`Price reminder SMS sent to ${analyst.name}`);
            smsResults.push({ analyst: analyst.name, success: true });
          }
        } catch (smsErr) {
          console.error(`SMS exception for ${analyst.name}:`, smsErr);
          smsResults.push({ analyst: analyst.name, success: false, error: String(smsErr) });
        }
      } else {
        console.log(`No phone number for ${analyst.name}, skipping SMS`);
      }
    }

    // Create in-app notification
    for (const analyst of analysts) {
      await supabase.from('finance_notifications').insert({
        title: 'Morning Price Reminder',
        message: `Good morning! Please update today's (${today}) coffee buying prices. The team needs updated prices for purchasing.`,
        type: 'price_reminder',
        priority: 'high',
        target_user_email: analyst.email,
        sender_name: 'System',
        metadata: { reminder_date: today, reminder_type: 'morning_price' }
      });
    }

    const result = {
      success: true,
      date: today,
      eatHour,
      analystsNotified: analysts.length,
      smsResults
    };

    console.log('Morning price reminder completed:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in analyst-price-reminder:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
