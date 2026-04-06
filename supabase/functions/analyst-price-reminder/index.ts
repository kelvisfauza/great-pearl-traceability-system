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

    // Get EAT time (UTC+3)
    const now = new Date();
    const eatTime = new Date(now.getTime() + (3 * 60 * 60 * 1000));
    const today = eatTime.toISOString().split('T')[0];
    const eatHour = eatTime.getUTCHours();
    const eatDay = eatTime.getUTCDay();

    // Tomorrow's date
    const tomorrowDate = new Date(eatTime);
    tomorrowDate.setUTCDate(tomorrowDate.getUTCDate() + 1);
    const tomorrow = tomorrowDate.toISOString().split('T')[0];

    console.log(`Price reminder check - EAT hour: ${eatHour}, day: ${eatDay}, date: ${today}`);

    // Skip weekends
    if (eatDay === 0 || eatDay === 6) {
      return new Response(
        JSON.stringify({ message: 'Weekend - skipping' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // TWO windows: Morning 7-10 AM (set today's prices) and Evening 7-10 PM (set tomorrow's prices)
    const isMorningWindow = eatHour >= 7 && eatHour < 10;
    const isEveningWindow = eatHour >= 19 && eatHour < 22;

    if (!isMorningWindow && !isEveningWindow) {
      return new Response(
        JSON.stringify({ message: 'Outside reminder windows', eatHour }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine which date to check prices for
    const targetDate = isEveningWindow ? tomorrow : today;
    const reminderType = isEveningWindow ? 'evening_price_reminder' : 'price_reminder';
    const periodLabel = isEveningWindow ? "tomorrow's" : "today's";

    // Check if prices have been submitted for target date
    const { data: priceRequests } = await supabase
      .from('price_approval_requests')
      .select('id, status, target_date')
      .eq('target_date', targetDate)
      .in('status', ['pending', 'approved'])
      .limit(1);

    if (priceRequests && priceRequests.length > 0) {
      console.log(`Prices already submitted for ${targetDate}`);
      return new Response(
        JSON.stringify({ message: `Prices already set for ${targetDate}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Also check price_history as fallback
    const { data: priceHistory } = await supabase
      .from('price_history')
      .select('id, arabica_buying_price, robusta_buying_price')
      .eq('price_date', targetDate)
      .limit(1);

    const pricesSet = priceHistory && priceHistory.length > 0 && 
      ((priceHistory[0] as any).arabica_buying_price > 0 || (priceHistory[0] as any).robusta_buying_price > 0);

    if (pricesSet) {
      console.log(`Prices already in price_history for ${targetDate}`);
      return new Response(
        JSON.stringify({ message: `Prices already set for ${targetDate}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check daily reminder limit
    const { count: remindersSentToday } = await supabase
      .from('sms_notification_queue')
      .select('*', { count: 'exact', head: true })
      .eq('notification_type', reminderType)
      .gte('created_at', `${today}T00:00:00+03:00`)
      .lte('created_at', `${today}T23:59:59+03:00`);

    const maxReminders = 5;
    if ((remindersSentToday || 0) >= maxReminders) {
      return new Response(
        JSON.stringify({ message: `Daily limit reached (${remindersSentToday}/${maxReminders})` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get data analysts
    const { data: analysts, error: employeeError } = await supabase
      .from('employees')
      .select('id, name, email, phone')
      .or('department.eq.Data Analysis,permissions.cs.{Data Analysis}')
      .eq('status', 'Active')
      .not('disabled', 'eq', true);

    if (employeeError || !analysts || analysts.length === 0) {
      return new Response(
        JSON.stringify({ message: "No data analysts found" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const displayDate = new Date(targetDate + 'T00:00:00+03:00').toLocaleDateString('en-GB', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
    });

    const smsResults = [];

    for (const analyst of analysts) {
      // SMS
      if (analyst.phone) {
        const message = isEveningWindow
          ? `Good evening ${analyst.name}! Please set tomorrow's (${displayDate}) coffee buying prices before you leave. Login at www.greatagrocoffeesystem.site → Set Prices. If not set, you'll be blocked from other tasks tomorrow morning. - Great Agro Coffee`
          : `Good morning ${analyst.name}! Please update ${periodLabel} coffee buying prices. Login at www.greatagrocoffeesystem.site → Set Prices. You cannot access other features until prices are set. - Great Agro Coffee`;

        try {
          const { error: smsError } = await supabase.functions.invoke('send-sms', {
            body: {
              phone: analyst.phone,
              message,
              employee_name: analyst.name,
              notification_type: reminderType
            }
          });
          smsResults.push({ analyst: analyst.name, channel: 'sms', success: !smsError });
        } catch (e) {
          smsResults.push({ analyst: analyst.name, channel: 'sms', success: false, error: String(e) });
        }
      }

      // Email
      if (analyst.email) {
        try {
          const { error: emailError } = await supabase.functions.invoke('send-transactional-email', {
            body: {
              templateName: 'price-reminder',
              recipientEmail: analyst.email,
              idempotencyKey: `${reminderType}-${targetDate}-${analyst.email}-${remindersSentToday || 0}`,
              templateData: {
                analystName: analyst.name,
                date: displayDate,
                targetDate,
                isEvening: isEveningWindow,
                loginUrl: 'https://www.greatagrocoffeesystem.site',
              },
            },
          });
          smsResults.push({ analyst: analyst.name, channel: 'email', success: !emailError });
        } catch (e) {
          smsResults.push({ analyst: analyst.name, channel: 'email', success: false, error: String(e) });
        }
      }

      // In-app notification
      await supabase.from('notifications').insert({
        title: isEveningWindow ? "Set Tomorrow's Prices" : 'Morning Price Reminder',
        message: isEveningWindow
          ? `Please set tomorrow's (${displayDate}) coffee buying prices before you leave today. If not set, you'll be blocked from other tasks tomorrow morning.`
          : `Please update ${periodLabel} (${displayDate}) coffee buying prices. You cannot access other features until prices are set.`,
        type: reminderType,
        priority: 'high',
        target_user_email: analyst.email,
        sender_name: 'System',
        metadata: { reminder_date: targetDate, reminder_type: isEveningWindow ? 'evening_price' : 'morning_price' }
      });
    }

    const result = {
      success: true,
      date: today,
      targetDate,
      window: isEveningWindow ? 'evening' : 'morning',
      analystsNotified: analysts.length,
      smsResults
    };

    console.log('Price reminder completed:', result);
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in analyst-price-reminder:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
