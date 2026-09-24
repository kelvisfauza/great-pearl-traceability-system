import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AMOUNT = 50000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Kampala date (UTC+3)
    const kla = new Date(Date.now() + 3 * 3600 * 1000);
    const month = kla.getUTCMonth() + 1;
    const day = kla.getUTCDate();
    const year = kla.getUTCFullYear();

    const { data: employees, error } = await supabase
      .from('employees')
      .select('id, name, email, phone, date_of_birth, disabled')
      .not('date_of_birth', 'is', null)
      .eq('status', 'Active');
    if (error) throw error;

    const birthdayEmployees = (employees || []).filter((emp: any) => {
      if (emp.disabled === true) return false;
      const [, m, d] = String(emp.date_of_birth).slice(0, 10).split('-').map(Number);
      return m === month && d === day;
    });

    const results: any[] = [];

    for (const emp of birthdayEmployees) {
      try {
        const ref = `BD-${year}-${emp.email.split('@')[0].toUpperCase()}`;
        const firstName = String(emp.name).split(' ')[0];

        const { data: existing } = await supabase
          .from('birthday_rewards').select('*')
          .eq('employee_email', emp.email).eq('birthday_year', year).maybeSingle();

        // 1. Wallet credit (idempotent by reference)
        const { data: userId } = await supabase.rpc('get_unified_user_id', { input_email: emp.email });
        let credited = false;
        let ledgerError: string | null = null;
        if (userId) {
          const { data: led } = await supabase.from('ledger_entries').select('id').eq('reference', ref).maybeSingle();
          if (led) credited = true;
          else {
            const { error: lErr } = await supabase.from('ledger_entries').insert({
              user_id: String(userId),
              entry_type: 'DEPOSIT',
              amount: AMOUNT,
              reference: ref,
              source_category: 'SYSTEM_AWARD',
              metadata: {
                allowance_type: 'Birthday Gift',
                employee_name: emp.name,
                description: `Happy Birthday ${emp.name}! Birthday gift of UGX 50,000`,
              },
            });
            if (lErr) ledgerError = lErr.message; else credited = true;
          }
        } else ledgerError = 'no unified user id';

        if (!existing) {
          await supabase.from('birthday_rewards').insert({
            employee_id: emp.id, employee_email: emp.email, employee_name: emp.name,
            birthday_year: year, amount: AMOUNT, ledger_reference: ref, sms_sent: false, email_sent: false,
          });
        }

        // 2. SMS
        let smsSent = existing?.sms_sent === true && existing?.ledger_reference && credited && !!existing;
        if (emp.phone && !(existing?.sms_sent && existing?.email_sent)) {
          const { data: smsRes, error: smsErr } = await supabase.functions.invoke('send-sms', {
            body: {
              phone: emp.phone,
              message: `Happy Birthday ${firstName}! Great Agro Coffee wishes you a wonderful day.${credited ? ' UGX 50,000 has been added to your wallet as a birthday gift.' : ''} Enjoy your special day!`,
              userName: emp.name,
              messageType: 'birthday',
              recipientEmail: emp.email,
            },
          });
          smsSent = !smsErr && (smsRes as any)?.ok !== false;
        }

        // 3. Email
        let emailSent = !!existing?.email_sent;
        if (!emailSent && emp.email) {
          const { error: mErr } = await supabase.functions.invoke('send-transactional-email', {
            body: {
              templateName: 'birthday-wish',
              recipientEmail: emp.email,
              idempotencyKey: `birthday-${year}-${emp.id}`,
              templateData: { employeeName: firstName, amount: '50,000', reference: ref },
            },
          });
          emailSent = !mErr;
        }

        await supabase.from('birthday_rewards')
          .update({ sms_sent: !!smsSent, email_sent: emailSent })
          .eq('employee_email', emp.email).eq('birthday_year', year);

        results.push({ email: emp.email, name: emp.name, credited, ledgerError, smsSent, emailSent });
      } catch (e) {
        results.push({ email: emp.email, status: 'error', reason: String(e) });
      }
    }

    return new Response(JSON.stringify({ ok: true, date: `${year}-${month}-${day}`, birthdays_found: birthdayEmployees.length, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: any) {
    console.error('Birthday check error:', error);
    return new Response(JSON.stringify({ ok: false, error: error.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
