import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // ---- AuthN/AuthZ: only Super Admin / Administrator may approve payroll ----
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const { data: caller } = await supabase
      .from('employees')
      .select('role, status, email')
      .eq('auth_user_id', userData.user.id)
      .maybeSingle();
    if (!caller || caller.status !== 'Active' || !['Super Admin', 'Administrator'].includes(caller.role)) {
      return new Response(JSON.stringify({ ok: false, error: 'Forbidden — Administrator role required' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { runId, approvedBy, approvedByEmail, disburse = true } = await req.json();
    if (!runId) return new Response(JSON.stringify({ ok: false, error: 'runId required' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { data: run, error: runErr } = await supabase.from('payroll_runs').select('*').eq('id', runId).single();
    if (runErr || !run) throw runErr || new Error('Run not found');
    if (run.status === 'disbursed') {
      return new Response(JSON.stringify({ ok: false, error: 'Already disbursed' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    // Note: payroll approval does not enforce self-approval SoD because the
    // Administrator is typically the sole approver who also generates the run.
    const verifiedEmail = (caller.email || userData.user.email || '').toLowerCase();

    await supabase.from('payroll_runs').update({
      status: 'approved',
      approved_by: approvedBy || caller.email || 'Admin',
      approved_by_email: verifiedEmail || null,
      approved_at: new Date().toISOString(),
    }).eq('id', runId);

    if (!disburse) {
      return new Response(JSON.stringify({ ok: true, status: 'approved' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Disburse: invoke process-auto-salaries with payroll_run_id (extends existing logic to apply NSSF + PAYE)
    // IMPORTANT: Supabase Edge gateway expects a JWT in Authorization. Service keys are API keys,
    // so pass them only via `apikey` for this service-to-service call.
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const invokeResp = await fetch(`${supabaseUrl}/functions/v1/process-auto-salaries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceKey,
      },
      body: JSON.stringify({ payrollRunId: runId, month: run.month }),
    });
    const result = await invokeResp.json().catch(() => ({}));
    if (!invokeResp.ok) {
      throw new Error(`process-auto-salaries failed (${invokeResp.status}): ${JSON.stringify(result)}`);
    }

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