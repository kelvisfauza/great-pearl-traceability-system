import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';
import { registeredPhone, deliveryAccepted } from '../_shared/message-policy.ts';

// Read-only Microsoft 365 / Entra directory view for active Administrators. Every read is audited.
const Input = z.object({ view: z.enum(['overview', 'users', 'devices', 'managed', 'signins', 'risky']), search: z.string().trim().max(80).optional(), next: z.string().max(2000).optional() });
const ACTIONS = ['lock', 'restart', 'sync', 'block', 'unblock', 'retire', 'wipe'] as const;
const Action = z.object({ action: z.enum(ACTIONS), deviceId: z.string().uuid(), confirmName: z.string().max(200), acknowledge: z.literal(true) });
const Meeting = z.object({ meeting: z.literal('create'), organizer: z.string().email().max(200), subject: z.string().trim().min(3).max(200), start: z.string().datetime({ offset: true }), minutes: z.number().int().min(15).max(480), attendees: z.array(z.string().uuid()).max(100).default([]) });
const MANAGED_FIELDS = 'id,deviceName,userPrincipalName,userDisplayName,operatingSystem,osVersion,model,manufacturer,complianceState,lastSyncDateTime,azureADDeviceId,managedDeviceOwnerType,enrolledDateTime';
const GATEWAY = 'https://connector-gateway.lovable.dev/azure_graph';
const USER_FIELDS = 'id,displayName,userPrincipalName,mail,jobTitle,department,accountEnabled,createdDateTime';
const USER_FIELDS_SIGNIN = USER_FIELDS + ',signInActivity';
const DEVICE_FIELDS = 'id,displayName,operatingSystem,operatingSystemVersion,accountEnabled,approximateLastSignInDateTime,trustType,isManaged,isCompliant';

Deno.serve(async req => {
  const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  if (req.method === 'OPTIONS') return reply({ ok: true });
  if (req.method !== 'POST') return reply({ ok: false, error: 'Method not allowed' }, 405);
  try {
    const client = createClient(Deno.env.get('SUPABASE_URL') || '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '', { auth: { persistSession: false } });
    const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return reply({ ok: false, error: 'Sign in required', denied: true });
    const { data: auth, error: authError } = await client.auth.getUser(token);
    if (authError || !auth.user?.email) return reply({ ok: false, error: 'Please sign in again', denied: true });
    const { data: person } = await client.from('employees').select('name,disabled,status').ilike('email', auth.user.email).maybeSingle();
    const { data: roles } = await client.from('user_roles').select('role').eq('user_id', auth.user.id).in('role', ['Administrator', 'Super Admin']);
    if (!person || person.disabled === true || String(person.status).toLowerCase() !== 'active' || !roles?.length) return reply({ ok: false, error: 'Active administrator access required', denied: true });
    const raw = await req.json().catch(() => ({}));
    if (raw && typeof raw === 'object' && 'meeting' in raw) {
      const m = Meeting.safeParse(raw);
      if (!m.success) return reply({ ok: false, error: 'Check the meeting details' });
      const gk = Deno.env.get('LOVABLE_API_KEY'); const ck = Deno.env.get('AZURE_GRAPH_API_KEY');
      if (!gk || !ck) return reply({ ok: false, error: 'Microsoft 365 connection is not configured' });
      const { organizer, subject, start, minutes, attendees } = m.data;
      const startAt = new Date(start); const endAt = new Date(startAt.getTime() + minutes * 60000);
      const auditId = crypto.randomUUID();
      const { error: aErr } = await client.from('audit_logs').insert({ id: auditId, action: 'teams_meeting_create_submitted', table_name: 'microsoft_teams_meetings', record_id: organizer, performed_by: auth.user.email, reason: `Administrator requested Teams meeting "${subject}"`, record_data: { organizer, subject, start: startAt.toISOString(), minutes } });
      if (aErr) return reply({ ok: false, error: 'Could not record the meeting request; nothing was sent to Microsoft' });
      const gh = { Authorization: `Bearer ${gk}`, 'X-Connection-Api-Key': ck };
      const ur = await fetch(`${GATEWAY}/v1.0/users/${encodeURIComponent(organizer)}?$select=id`, { headers: gh, signal: AbortSignal.timeout(25000) });
      const uid = ur.ok ? (await ur.json())?.id : null;
      if (!uid) { await client.from('audit_logs').update({ action: 'teams_meeting_create_refused', record_data: { organizer, subject, result: `organizer not found (${ur.status})` } }).eq('id', auditId); return reply({ ok: false, error: 'That organizer email was not found in Microsoft 365' }); }
      const r = await fetch(`${GATEWAY}/v1.0/users/${uid}/onlineMeetings`, { method: 'POST', headers: { Authorization: `Bearer ${gk}`, 'X-Connection-Api-Key': ck, 'Content-Type': 'application/json' }, body: JSON.stringify({ subject, startDateTime: startAt.toISOString(), endDateTime: endAt.toISOString() }), signal: AbortSignal.timeout(25000) });
      const text = await r.text();
      let res: Record<string, unknown>;
      if (!r.ok) { let msg = text; try { msg = JSON.parse(text)?.error?.message ?? text; } catch { /* keep */ } res = { ok: false, error: `Microsoft returned ${r.status}: ${String(msg).slice(0, 300)}` }; }
      else {
        const d = JSON.parse(text);
        const meetingId = d.joinMeetingIdSettings?.joinMeetingId ?? null; const passcode = d.joinMeetingIdSettings?.passcode ?? null;
        res = { ok: true, joinUrl: d.joinWebUrl, subject, start: startAt.toISOString(), end: endAt.toISOString(), organizer, meetingId, passcode };
        if (attendees.length) {
          const { data: people } = await client.from('employees').select('id,name,phone,status,disabled').in('id', attendees);
          const when = startAt.toLocaleString('en-GB', { timeZone: 'Africa/Kampala', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
          const now = Math.abs(startAt.getTime() - Date.now()) < 10 * 60000;
          const join = meetingId ? ` Join in Teams with Meeting ID ${String(meetingId).replace(/(\d{3})(?=\d)/g, '$1 ')}${passcode ? `, Passcode ${passcode}` : ''}.` : ' Open Microsoft Teams to join.';
          const msg = `Great Agro Coffee: Teams meeting "${subject.slice(0, 60)}" ${now ? 'has started now' : `is scheduled for ${when}`} (${minutes} min).${join}`;
          let sent = 0, failed = 0, skipped = 0;
          for (const p of people ?? []) {
            if (p.disabled === true || String(p.status).toLowerCase() !== 'active' || !p.phone || !await registeredPhone(client, p.phone)) { skipped++; continue; }
            try {
              const sr = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-sms`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` }, body: JSON.stringify({ phone: p.phone, message: msg, messageType: 'company_broadcast', userName: p.name, triggeredBy: auth.user.email, requestId: auditId }) });
              if (deliveryAccepted(sr.ok, await sr.json().catch(() => null))) sent++; else failed++;
            } catch { failed++; }
          }
          res.sms = { sent, failed, skipped };
        }
      }
      await client.from('audit_logs').update({ action: `teams_meeting_create_${res.ok ? 'created' : 'refused'}`, record_data: { organizer, subject, start: startAt.toISOString(), minutes, joinUrl: res.ok ? res.joinUrl : null, attendees: attendees.length, sms: (res as any).sms ?? null, result: res.ok ? 'created' : res.error } }).eq('id', auditId);
      return reply(res);
    }
    if (raw && typeof raw === 'object' && 'meetings' in raw) {
      const { data: rows } = await client.from('audit_logs').select('record_data,performed_by,created_at').eq('action', 'teams_meeting_create_created').order('created_at', { ascending: false }).limit(20);
      return reply({ ok: true, items: (rows ?? []).map((x: any) => ({ ...x.record_data, createdBy: x.performed_by, createdAt: x.created_at })) });
    }
    if (raw && typeof raw === 'object' && 'action' in raw) {
      const a = Action.safeParse(raw);
      if (!a.success) return reply({ ok: false, error: 'Invalid device action' });
      const gk = Deno.env.get('LOVABLE_API_KEY'); const ck = Deno.env.get('AZURE_GRAPH_API_KEY');
      if (!gk || !ck) return reply({ ok: false, error: 'Microsoft 365 connection is not configured' });
      const g = async (path: string, method = 'GET', body?: unknown) => {
        const headers: Record<string, string> = { Authorization: `Bearer ${gk}`, 'X-Connection-Api-Key': ck };
        if (body) headers['Content-Type'] = 'application/json';
        const r = await fetch(`${GATEWAY}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(25000) });
        const text = await r.text();
        if (!r.ok) { let msg = text; try { msg = JSON.parse(text)?.error?.message ?? text; } catch { /* keep */ } return { ok: false as const, status: r.status, error: `Microsoft returned ${r.status}: ${String(msg).slice(0, 300)}` }; }
        return { ok: true as const, data: text ? JSON.parse(text) : null };
      };
      const { action, deviceId, confirmName } = a.data;
      const dev = await g(`/v1.0/deviceManagement/managedDevices/${deviceId}?$select=id,deviceName,userPrincipalName,azureADDeviceId`);
      if (!dev.ok) return reply(dev);
      if ((dev.data.deviceName ?? '').trim().toLowerCase() !== confirmName.trim().toLowerCase()) return reply({ ok: false, error: 'Type the exact device name to confirm' });
      const auditId = crypto.randomUUID();
      const { error: auditErr } = await client.from('audit_logs').insert({ id: auditId, action: `entra_device_${action}_submitted`, table_name: 'microsoft_entra_devices', record_id: deviceId, performed_by: auth.user.email, reason: `Administrator requested ${action} on ${dev.data.deviceName}`, record_data: { device: dev.data.deviceName, user: dev.data.userPrincipalName } });
      if (auditErr) return reply({ ok: false, error: 'Could not record the action; nothing was sent to Microsoft' });
      let res;
      const base = `/v1.0/deviceManagement/managedDevices/${deviceId}`;
      if (action === 'lock') res = await g(`${base}/remoteLock`, 'POST');
      else if (action === 'restart') res = await g(`${base}/rebootNow`, 'POST');
      else if (action === 'sync') res = await g(`${base}/syncDevice`, 'POST');
      else if (action === 'retire') res = await g(`${base}/retire`, 'POST');
      else if (action === 'wipe') res = await g(`${base}/wipe`, 'POST', { keepEnrollmentData: false, keepUserData: false });
      else {
        const find = await g(`/v1.0/devices?$filter=deviceId eq '${dev.data.azureADDeviceId}'&$select=id`);
        const dirId = find.ok ? find.data?.value?.[0]?.id : null;
        res = dirId ? await g(`/v1.0/devices/${dirId}`, 'PATCH', { accountEnabled: action === 'unblock' }) : { ok: false as const, error: find.ok ? 'Device not found in the directory' : find.error };
      }
      await client.from('audit_logs').update({ action: `entra_device_${action}_${res.ok ? 'sent' : 'refused'}`, record_data: { device: dev.data.deviceName, user: dev.data.userPrincipalName, result: res.ok ? 'accepted' : res.error } }).eq('id', auditId);
      return reply(res.ok ? { ok: true, message: `Microsoft accepted the ${action} request for ${dev.data.deviceName}. The device carries it out next time it is online.` } : res);
    }
    const parsed = Input.safeParse(raw);
    if (!parsed.success) return reply({ ok: false, error: 'Invalid request' });
    const gatewayKey = Deno.env.get('LOVABLE_API_KEY');
    const connectionKey = Deno.env.get('AZURE_GRAPH_API_KEY');
    if (!gatewayKey || !connectionKey) return reply({ ok: false, error: 'Microsoft 365 connection is not configured' });

    const graph = async (path: string, advanced = false) => {
      const headers: Record<string, string> = { Authorization: `Bearer ${gatewayKey}`, 'X-Connection-Api-Key': connectionKey };
      if (advanced) headers.ConsistencyLevel = 'eventual';
      const r = await fetch(`${GATEWAY}${path}`, { headers, signal: AbortSignal.timeout(25000) });
      const text = await r.text();
      if (!r.ok) { console.error(`Graph ${r.status}`); let msg = text; try { msg = JSON.parse(text)?.error?.message ?? text; } catch { /* keep */ } throw new Error(`Microsoft returned ${r.status}: ${String(msg).slice(0, 300)}`); }
      return text ? JSON.parse(text) : null;
    };
    const nextPath = (link?: string) => {
      if (!link) return undefined;
      const u = new URL(link);
      if (u.hostname !== 'graph.microsoft.com') throw new Error('Unexpected pagination link');
      return `${u.pathname}${u.search}`;
    };
    const { view, search, next } = parsed.data;
    if (next && !/^\/v1\.0\/(users|devices|deviceManagement\/managedDevices|auditLogs\/signIns)\?/.test(next)) return reply({ ok: false, error: 'Invalid page link' });
    const q = search ? encodeURIComponent(`"displayName:${search.replace(/"/g, '')}"`) : '';

    let result: Record<string, unknown>;
    if (view === 'overview') {
      const [org, users, devices] = await Promise.all([
        graph('/v1.0/organization?$select=displayName,countryLetterCode,verifiedDomains'),
        graph('/v1.0/users/$count', true).catch(() => null),
        graph('/v1.0/devices/$count', true).catch(() => null),
      ]);
      const o = org?.value?.[0] ?? {};
      result = { organization: { name: o.displayName ?? null, country: o.countryLetterCode ?? null, domains: (o.verifiedDomains ?? []).map((d: any) => d.name) }, userCount: typeof users === 'number' ? users : null, deviceCount: typeof devices === 'number' ? devices : null };
    } else if (view === 'signins') {
      const data = await graph(next ?? `/v1.0/auditLogs/signIns?$top=50&$select=id,createdDateTime,userDisplayName,userPrincipalName,appDisplayName,ipAddress,location,deviceDetail,status,riskLevelAggregated,riskState,conditionalAccessStatus`);
      result = { items: data?.value ?? [], next: nextPath(data?.['@odata.nextLink']) ?? null };
    } else if (view === 'risky') {
      const data = await graph(`/v1.0/identityProtection/riskyUsers?$top=50`);
      result = { items: data?.value ?? [], next: null };
    } else {
      const fields = view === 'users' ? USER_FIELDS : view === 'managed' ? MANAGED_FIELDS : DEVICE_FIELDS;
      const coll = view === 'managed' ? 'deviceManagement/managedDevices' : view;
      const mq = view === 'managed' && search ? `&$filter=${encodeURIComponent(`startswith(deviceName,'${search.replace(/'/g, "''")}')`)}` : '';
      const path = next ?? `/v1.0/${coll}?$select=${fields}&$top=50${view === 'managed' ? mq : q ? `&$search=${q}&$count=true` : ''}`;
      const adv = view !== 'managed' && (!!q || !!next?.includes('$search'));
      let data; let signInHidden = false;
      if (view === 'users' && !next) { try { data = await graph(path.replace(`$select=${USER_FIELDS}`, `$select=${USER_FIELDS_SIGNIN}`), adv); } catch { signInHidden = true; } }
      if (!data) data = await graph(path, adv);
      result = { items: data?.value ?? [], next: nextPath(data?.['@odata.nextLink']) ?? null, signInHidden };
    }
    await client.from('audit_logs').insert({ action: 'entra_directory_read', table_name: 'microsoft_entra', record_id: view, performed_by: auth.user.email, reason: 'Administrator viewed Microsoft 365 staff/devices', record_data: { view, search: search ?? null, paged: !!next } });
    return reply({ ok: true, ...result });
  } catch (e) {
    return reply({ ok: false, error: e instanceof Error ? e.message : 'Microsoft 365 could not be reached' });
  }
});
