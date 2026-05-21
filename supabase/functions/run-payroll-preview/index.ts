import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { calculatePayroll } from '../_shared/statutory.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // ---- AuthN/AuthZ: only Finance/Admin can create payroll runs ----
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
      .select('role, status, permissions, email')
      .eq('auth_user_id', userData.user.id)
      .maybeSingle();
    const isAdmin = caller && ['Super Admin', 'Administrator'].includes(caller.role);
    const isFinance = Array.isArray(caller?.permissions) && caller!.permissions.includes('Finance');
    if (!caller || caller.status !== 'Active' || (!isAdmin && !isFinance)) {
      return new Response(JSON.stringify({ ok: false, error: 'Forbidden — Finance or Administrator role required' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await req.json().catch(() => ({}));
    const rawMonth: string = body.month || new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
    // Validate month format (letters, digits, space only) to avoid injection
    const month: string = /^[A-Za-z0-9 ]{3,32}$/.test(rawMonth) ? rawMonth : new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
    const createdBy: string = caller.email || body.createdBy || 'System';
    const createdByEmail: string = caller.email || userData.user.email || '';

    const { data: employees, error } = await supabase
      .from('employees')
      .select('id, employee_id, name, email, salary, phone, department, auth_user_id')
      .eq('status', 'Active')
      .not('is_training_account', 'eq', true);
    if (error) throw error;

    const { data: taxProfiles } = await supabase
      .from('employee_tax_profile')
      .select('employee_id, nssf_exempt, paye_exempt, tin, nssf_number');
    const profileMap = new Map<string, any>();
    for (const p of taxProfiles || []) profileMap.set(String(p.employee_id), p);

    const preview: any[] = [];
    let totG = 0, totNE = 0, totNR = 0, totP = 0, totN = 0;

    for (const emp of employees || []) {
      if (!emp.salary || emp.salary <= 0) continue;
      if (emp.email === 'operations@greatpearlcoffee.com') continue;
      const profile = profileMap.get(String(emp.id)) || profileMap.get(String(emp.employee_id)) || {};
      const calc = calculatePayroll(emp.salary, { nssfExempt: !!profile.nssf_exempt, payeExempt: !!profile.paye_exempt });
      preview.push({
        employee_id: emp.employee_id || emp.id,
        employee_uuid: emp.id,
        name: emp.name,
        email: emp.email,
        phone: emp.phone,
        department: emp.department,
        tin: profile.tin || null,
        nssf_number: profile.nssf_number || null,
        ...calc,
      });
      totG += calc.gross; totNE += calc.nssfEmployee; totNR += calc.nssfEmployer; totP += calc.paye; totN += calc.net;
    }

    const { data: run, error: runErr } = await supabase
      .from('payroll_runs')
      .insert({
        month,
        status: 'pending_approval',
        total_gross: totG,
        total_nssf_employee: totNE,
        total_nssf_employer: totNR,
        total_paye: totP,
        total_net: totN,
        employee_count: preview.length,
        created_by: createdBy,
        created_by_email: createdByEmail,
        preview,
      })
      .select()
      .single();
    if (runErr) throw runErr;

    return new Response(JSON.stringify({ ok: true, run }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('payroll-preview error:', e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});