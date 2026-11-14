import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { canReadWithdrawalHistory, historyPage, HISTORY_PAGE_SIZE } from '../_shared/withdrawal-history-rules.ts';

const reply = (body: Record<string, unknown>) => new Response(JSON.stringify(body), {
  status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !anonKey || !serviceKey) return reply({ ok: false, error: 'History is temporarily unavailable.' });
    const caller = createClient(url, anonKey, { global: { headers: { Authorization: req.headers.get('Authorization') || '' } } });
    const { data: auth, error: authError } = await caller.auth.getUser();
    if (authError || !auth.user) return reply({ ok: false, error: 'Please sign in again.' });
    const [active, finance, administrator, superAdmin] = await Promise.all([
      caller.rpc('is_active_staff'), caller.rpc('user_has_permission', { permission_name: 'Finance' }),
      caller.rpc('has_role', { _user_id: auth.user.id, _role: 'Administrator' }),
      caller.rpc('has_role', { _user_id: auth.user.id, _role: 'Super Admin' }),
    ]);
    if (!canReadWithdrawalHistory(active.data === true && !active.error, finance.data === true && !finance.error,
      (administrator.data === true && !administrator.error) || (superAdmin.data === true && !superAdmin.error))) {
      return reply({ ok: false, error: 'Only active Finance staff and administrators can view withdrawal history.' });
    }
    const db = createClient(url, serviceKey);
    const body = await req.json();
    const page = historyPage(body.page);
    const search = String(body.search || '').trim().slice(0, 100);
    const status = String(body.status || 'all');
    let query = db.from('instant_withdrawals').select('*', { count: 'exact' });
    if (status !== 'all') query = query.eq('payout_status', status);
    if (search) {
      // Match saved employee identities through the same email mapping as wallet resolution.
      const safe = search.replace(/[%_\\]/g, '\\$&');
      const { data: staff, error: staffError } = await db.from('employees').select('id, auth_user_id, email').ilike('name', `%${safe}%`).limit(100);
      if (staffError) throw staffError;
      const identities = await Promise.all((staff || []).map(async (e) => {
        const { data, error } = await db.rpc('get_unified_user_id', { input_email: e.email });
        if (error) throw error;
        return data;
      }));
      const ids = [...new Set([...identities, ...(staff || []).flatMap(e => [e.id, e.auth_user_id])]
        .filter((id): id is string => typeof id === 'string'))];
      const term = search.replace(/[^a-zA-Z0-9@+ ._-]/g, '').replace(/[%_]/g, '\\$&');
      const clauses = term ? [`payout_ref.ilike.%${term}%`, `phone_number.ilike.%${term}%`] : [];
      if (ids.length) clauses.push(`user_id.in.(${ids.join(',')})`);
      if (!clauses.length) return reply({ ok: true, withdrawals: [], total: 0 });
      query = query.or(clauses.join(','));
    }
    const { data: rows, error, count } = await query.order('created_at', { ascending: false }).order('id', { ascending: false })
      .range(page * HISTORY_PAGE_SIZE, (page + 1) * HISTORY_PAGE_SIZE - 1);
    if (error) throw error;
    const ids = [...new Set((rows || []).map(r => r.user_id))];
    const names = new Map<string, string>();
    await Promise.all(ids.map(async id => {
      const { data: staff, error } = await db.from('employees').select('name').or(`auth_user_id.eq.${id},id.eq.${id}`).maybeSingle();
      if (error) throw error;
      if (staff?.name) names.set(id, staff.name);
    }));
    return reply({ ok: true, withdrawals: (rows || []).map(r => ({ ...r, employee_name: names.get(r.user_id) || 'Staff member' })), total: count || 0 });
  } catch (error) {
    console.error('Withdrawal history read failed', error instanceof Error ? error.message : 'Unknown error');
    return reply({ ok: false, error: 'Could not load withdrawal history. Please try again.' });
  }
});