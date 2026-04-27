import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    const year = today.getFullYear();

    // Get all employees with date_of_birth set
    const { data: employees, error } = await supabase
      .from('employees')
      .select('id, name, email, phone, date_of_birth, department')
      .not('date_of_birth', 'is', null)
      .eq('status', 'Active');

    if (error) throw error;

    const birthdayEmployees = (employees || []).filter((emp: any) => {
      const dob = new Date(emp.date_of_birth);
      return dob.getMonth() + 1 === month && dob.getDate() === day;
    });

    const results: any[] = [];

    for (const emp of birthdayEmployees) {
      // Check if already awarded this year
      const { data: existing } = await supabase
        .from('birthday_rewards')
        .select('id')
        .eq('employee_email', emp.email)
        .eq('birthday_year', year)
        .single();

      if (existing) {
        results.push({ email: emp.email, status: 'already_awarded' });
        continue;
      }

      // Create ledger entry for 50k birthday reward
      const ref = `BD-${year}-${emp.email.split('@')[0].toUpperCase()}`;
      
      await supabase.from('ledger_entries').insert({
        employee_email: emp.email,
        employee_name: emp.name,
        type: 'CREDIT',
        amount: 50000,
        description: `🎂 Happy Birthday ${emp.name}! Birthday reward of UGX 50,000`,
        reference: ref,
        source_category: 'SYSTEM_AWARD'
      });

      // Record birthday reward
      await supabase.from('birthday_rewards').insert({
        employee_id: emp.id,
        employee_email: emp.email,
        employee_name: emp.name,
        birthday_year: year,
        amount: 50000,
        ledger_reference: ref,
        sms_sent: false
      });

      // Send SMS birthday wish
      if (emp.phone) {
        try {
          const smsPhone = emp.phone.startsWith('0') ? '256' + emp.phone.slice(1) : emp.phone;
          const message = `Happy Birthday ${emp.name.split(' ')[0]}! 🎂🎉 The company wishes you a wonderful day. UGX 50,000 has been added to your wallet as a birthday gift. Enjoy your special day!`;
          
          await fetch('https://api.gosentepay.com/api/v1/sms/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              api_key: Deno.env.get('GOSENTEPAY_API_KEY'),
              phone: smsPhone,
              message,
              sender_id: 'KAJONHR'
            })
          });

          await supabase.from('birthday_rewards')
            .update({ sms_sent: true })
            .eq('employee_email', emp.email)
            .eq('birthday_year', year);
        } catch (smsErr) {
          console.error('SMS error:', smsErr);
        }
      }

      results.push({ email: emp.email, name: emp.name, status: 'awarded', amount: 50000 });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      date: today.toISOString().split('T')[0],
      birthdays_found: birthdayEmployees.length,
      results 
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('Birthday check error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
