import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all active employees with phones
    const { data: employees, error } = await supabase
      .from('employees')
      .select('name, phone, email')
      .eq('status', 'Active')
      .not('is_training_account', 'eq', true)
      .neq('email', 'operations@greatpearlcoffee.com');

    if (error) throw error;

    const results: any[] = [];

    for (const emp of employees || []) {
      if (!emp.phone) continue;

      const message = `CORRECTION: Please disregard the earlier salary message for March 2026. Your salary was NOT credited. Salaries will be processed on the 27th as scheduled. We apologize for the error. Great Pearl Coffee.`;

      try {
        await supabase.functions.invoke('send-sms', {
          body: {
            phone: emp.phone,
            message,
            userName: emp.name,
            messageType: 'correction',
            triggeredBy: 'System Correction',
            recipientEmail: emp.email,
          },
        });
        results.push({ name: emp.name, status: 'sent' });
        console.log(`Correction SMS sent to ${emp.name}`);
      } catch (smsErr) {
        results.push({ name: emp.name, status: 'failed', error: String(smsErr) });
        console.error(`Failed to send correction to ${emp.name}:`, smsErr);
      }
    }

    return new Response(JSON.stringify({ sent: results.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
