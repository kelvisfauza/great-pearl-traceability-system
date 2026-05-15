import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { runId, approvedBy, approvedByEmail, disburse = true } = await req.json();
    if (!runId) return new Response(JSON.stringify({ ok: false, error: 'runId required' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { data: run, error: runErr } = await supabase.from('payroll_runs').select('*').eq('id', runId).single();
    if (runErr || !run) throw runErr || new Error('Run not found');
    if (run.status === 'disbursed') {
      return new Response(JSON.stringify({ ok: false, error: 'Already disbursed' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (run.created_by_email && approvedByEmail && run.created_by_email.toLowerCase() === String(approvedByEmail).toLowerCase()) {
      return new Response(JSON.stringify({ ok: false, error: 'Creator cannot approve their own payroll run' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    await supabase.from('payroll_runs').update({
      status: 'approved',
      approved_by: approvedBy || 'Admin',
      approved_by_email: approvedByEmail || null,
      approved_at: new Date().toISOString(),
    }).eq('id', runId);

    if (!disburse) {
      return new Response(JSON.stringify({ ok: true, status: 'approved' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Disburse: invoke process-auto-salaries with payroll_run_id (extends existing logic to apply NSSF + PAYE)
    const { data: result, error: invokeErr } = await supabase.functions.invoke('process-auto-salaries', {
      body: { payrollRunId: runId, month: run.month },
    });
    if (invokeErr) throw invokeErr;

    await supabase.from('payroll_runs').update({
      status: 'disbursed',
      disbursed_at: new Date().toISOString(),
    }).eq('id', runId);

    return new Response(JSON.stringify({ ok: true, status: 'disbursed', result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('approve-payroll-run error:', e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});