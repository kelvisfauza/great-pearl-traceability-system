import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { alertData, emailDelivered, SETTINGS_ALERT_RECIPIENT } from './rules.ts';

Deno.serve(async (req) => {
  const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return reply({ ok: false, error: 'method_not_allowed' }, 405);
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return reply({ ok: false, error: 'service_not_configured' });
  const client = createClient(url, key, { auth: { persistSession: false } });
  try {
    const token = req.headers.get('x-settings-dispatch-token');
    let allowed = false;
    if (token && /^[a-f0-9]{64}$/.test(token)) {
      const { data, error } = await client.rpc('settings_alert_auth', { p_token: token });
      allowed = !error && data === true;
    }
    if (!allowed) {
      const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
      if (!bearer) return reply({ ok: false, error: 'unauthorized' }, 401);
      const { data, error } = await client.auth.getUser(bearer);
      if (error || !data.user) return reply({ ok: false, error: 'unauthorized' }, 401);
      const { data: roles, error: roleError } = await client.from('user_roles').select('role').eq('user_id', data.user.id).in('role', ['Administrator', 'Super Admin']);
      const { data: person, error: personError } = await client.from('employees').select('disabled').ilike('email', data.user.email || '').maybeSingle();
      allowed = !roleError && !personError && person != null && person.disabled !== true && (roles?.length ?? 0) > 0;
    }
    if (!allowed) return reply({ ok: false, error: 'forbidden' }, 403);
    let body: unknown;
    try { body = await req.json(); } catch { return reply({ ok: false, error: 'invalid_json' }, 400); }
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length > 0) return reply({ ok: false, error: 'Expected an empty object' }, 400);
    const { data: events, error } = await client.rpc('claim_settings_alerts');
    if (error) throw error;
    let sent = 0;
    for (const event of events || []) {
      let delivered = false;
      let failure: string | null = null;
      try {
        const { data, error: sendError } = await client.functions.invoke('send-transactional-email', {
          body: { templateName: 'settings-change', recipientEmail: SETTINGS_ALERT_RECIPIENT, skipSms: true, idempotencyKey: `settings-change-${event.id}`, templateData: alertData(event) },
        });
        delivered = !sendError && emailDelivered(data);
        if (!delivered) failure = sendError?.message || data?.error || data?.reason || 'Email delivery not confirmed';
      } catch { failure = 'Email sender unavailable'; }
      const { error: finishError } = await client.rpc('finish_settings_alert', { p_id: event.id, p_sent: delivered, p_error: failure });
      if (finishError) throw finishError;
      if (delivered) sent++;
    }
    return reply({ ok: true, sent, processed: events?.length || 0 });
  } catch {
    return reply({ ok: false, error: 'settings_alert_processing_failed' });
  }
});