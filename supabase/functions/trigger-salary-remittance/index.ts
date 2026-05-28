import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { yoPayout, normalizePhone } from '../_shared/yo-payments.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { employeeEmail, month, netSalary, payrollRunId } = await req.json();
    if (!employeeEmail || !month || !netSalary) {
      return new Response(JSON.stringify({ ok: false, error: 'employeeEmail, month and netSalary are required' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: agreement, error: agErr } = await supabase
      .from('salary_remittance_agreements')
      .select('*')
      .eq('employee_email', employeeEmail)
      .eq('status', 'active')
      .maybeSingle();

    if (agErr || !agreement) {
      return new Response(JSON.stringify({ ok: false, error: 'No active remittance agreement found' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prevent duplicate
    const { data: existing } = await supabase
      .from('salary_remittance_payments')
      .select('id, yo_status')
      .eq('employee_email', employeeEmail)
      .eq('month', month)
      .maybeSingle();
    if (existing && existing.yo_status === 'success') {
      return new Response(JSON.stringify({ ok: false, error: 'Remittance already sent for this month', existing }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const pct = Number(agreement.percentage);
    const amount = Math.round((Number(netSalary) * pct) / 100);
    const recipientPhone = normalizePhone(agreement.recipient_phone);
    const narrative = `Salary remittance - ${agreement.employee_name} - ${month}`;

    const payout = await yoPayout({ phone: recipientPhone, amount, narrative });

    await supabase.from('salary_remittance_payments').insert({
      agreement_id: agreement.id,
      payroll_run_id: payrollRunId || null,
      employee_email: agreement.employee_email,
      employee_name: agreement.employee_name,
      month,
      recipient_name: agreement.recipient_name,
      recipient_phone: recipientPhone,
      net_salary: netSalary,
      percentage: pct,
      amount,
      yo_reference: payout.transactionRef || null,
      yo_status: payout.success ? 'success' : 'failed',
      yo_raw_response: { raw: payout.rawResponse || null, error: payout.errorMessage || null },
    });

    return new Response(JSON.stringify({
      ok: payout.success,
      amount,
      recipient: agreement.recipient_name,
      recipientPhone,
      yo_reference: payout.transactionRef,
      yo_status: payout.success ? 'success' : 'failed',
      error: payout.errorMessage || null,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('trigger-salary-remittance error:', e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});