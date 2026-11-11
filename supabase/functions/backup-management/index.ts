import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';
import { BACKUP_PROJECT, canRestore, providerMessage } from '../_shared/backup-rules.ts';

const Input = z.discriminatedUnion('action', [
  z.object({ action: z.literal('status') }),
  z.object({ action: z.literal('restore'), id: z.number().int().positive(), confirmation: z.string().max(100), acknowledge: z.literal(true) }),
]);
const GATEWAY = `https://connector-gateway.lovable.dev/udc_supabase_backup_management/v1/projects/${BACKUP_PROJECT}/database/backups`;
Deno.serve(async req => {
  const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  if (req.method === 'OPTIONS') return reply({ ok: true });
  if (req.method !== 'POST') return reply({ ok: false, error: 'Method not allowed' }, 405);
  try {
    const client = createClient(Deno.env.get('SUPABASE_URL') || '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '', { auth: { persistSession: false } });
    const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return reply({ ok: false, error: 'Sign in required' }, 401);
    const { data: auth, error: authError } = await client.auth.getUser(token);
    if (authError || !auth.user?.email) return reply({ ok: false, error: 'Invalid session' }, 401);
    const { data: personId, error: identityError } = await client.rpc('get_unified_user_id', { input_email: auth.user.email });
    const people = client.from('employees').select('name,disabled,status');
    const { data: person, error: personError } = await (/^[0-9a-f-]{36}$/i.test(personId || '') ? people.eq('auth_user_id', personId) : people.ilike('email', auth.user.email)).maybeSingle();
    const { data: roles, error: roleError } = await client.from('user_roles').select('role').eq('user_id', auth.user.id).in('role', ['Administrator', 'Super Admin']);
    if (identityError || personError || roleError || !person || person.disabled === true || person.status !== 'active' || !roles?.length) return reply({ ok: false, error: 'Active administrator access required' }, 403);
    const parsed = Input.safeParse(await req.json());
    if (!parsed.success) return reply({ ok: false, error: 'Invalid backup request' }, 400);
    const gatewayKey = Deno.env.get('LOVABLE_API_KEY');
    const connectionKey = Deno.env.get('UDC_SUPABASE_BACKUP_MANAGEMENT_API_KEY');
    if (!gatewayKey || !connectionKey) return reply({ ok: false, error: 'Supabase backup connection is not configured' });
    const call = async (path: string, body?: object) => {
      const response = await fetch(`${GATEWAY}${path}`, { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${gatewayKey}`, 'X-Connection-Api-Key': connectionKey, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(25000) });
      const text = await response.text();
      if (!response.ok) return { ok: false as const, status: response.status, details: text, error: providerMessage(response.status, text) };
      return { ok: true as const, data: text ? JSON.parse(text) : null };
    };
    const history = await call('');
    if (!history.ok) return reply(history);
    if (!Array.isArray(history.data?.backups)) return reply({ ok: false, error: 'Supabase returned an unexpected backup response' });
    const roleNames = roles.map(r => r.role);
    if (parsed.data.action === 'status') {
      const [schedule, point] = await Promise.all([call('/schedule'), call('/restore-point')]);
      return reply({ ok: true, checked_at: new Date().toISOString(), backups: history.data.backups.map((b: any) => ({ id: b.id, status: String(b.status).toLowerCase(), inserted_at: b.inserted_at, physical: b.is_physical_backup })), pitr_enabled: history.data.pitr_enabled === true, schedule: schedule.ok ? schedule.data : null, schedule_error: schedule.ok ? null : schedule.error, recovery_point: point.ok ? point.data : null, recovery_point_error: point.ok ? null : point.error, can_restore: roleNames.includes('Super Admin') });
    }
    const input = parsed.data;
    const backup = history.data.backups.find((b: any) => b.id === input.id);
    // Auth server validates the token above; JWT auth_time/iat only establishes recency, never role authority.
    let claims: { auth_time?: number; iat?: number } = {};
    try { claims = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); } catch { return reply({ ok: false, error: 'Sign in again before restoring' }); }
    // iat is refreshed automatically and is NOT proof of a recent sign-in.
    const signInAt = claims.auth_time ?? Date.parse(auth.user.last_sign_in_at || '') / 1000;
    if (!canRestore(roleNames, signInAt, Date.now() / 1000, input.confirmation, backup)) return reply({ ok: false, error: 'Restore requires Super Admin, a sign-in within ten minutes and exact confirmation of a completed backup' });
    const { data: outstanding, error: outstandingError } = await client.from('audit_logs').select('id').eq('table_name', 'supabase_backups').eq('action', 'backup_restore_submitted').limit(1);
    if (outstandingError || outstanding?.length) return reply({ ok: false, error: 'A restore may already be submitted. Check Supabase before any further recovery action.' });
    const auditId = crypto.randomUUID();
    const { error: auditError } = await client.from('audit_logs').insert({ id: auditId, action: 'backup_restore_submitted', table_name: 'supabase_backups', record_id: String(backup.id), performed_by: auth.user.email, reason: 'Explicitly confirmed production database restore', record_data: { backup_date: backup.inserted_at, requested_at: new Date().toISOString(), project: BACKUP_PROJECT } });
    if (auditError) return reply({ ok: false, error: 'Could not record the restore request; nothing was submitted' });
    try {
      const result = await call('/restore', { id: backup.id });
      if (!result.ok) {
        await client.from('audit_logs').update({ action: 'backup_restore_rejected', record_data: { backup_date: backup.inserted_at, provider_status: result.status } }).eq('id', auditId);
        return reply(result);
      }
      return reply({ ok: true, message: 'Restore submitted to Supabase. Completion is not yet confirmed; the system may be unavailable during recovery.' });
    } catch { return reply({ ok: false, error: 'Restore outcome is unconfirmed. Do not retry: check Supabase recovery status first.' }); }
  } catch { return reply({ ok: false, error: 'Backup connection could not be reached. Refresh to check again; no automatic recovery was attempted.' }); }
});