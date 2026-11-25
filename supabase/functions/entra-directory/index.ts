import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';

// Read-only Microsoft 365 / Entra directory view for active Administrators. Every read is audited.
const Input = z.object({ view: z.enum(['overview', 'users', 'devices']), search: z.string().trim().max(80).optional(), next: z.string().max(2000).optional() });
const GATEWAY = 'https://connector-gateway.lovable.dev/azure_graph';
const USER_FIELDS = 'id,displayName,userPrincipalName,mail,jobTitle,department,accountEnabled,createdDateTime';
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
    const parsed = Input.safeParse(await req.json().catch(() => ({})));
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
    if (next && !/^\/v1\.0\/(users|devices)\?/.test(next)) return reply({ ok: false, error: 'Invalid page link' });
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
    } else {
      const fields = view === 'users' ? USER_FIELDS : DEVICE_FIELDS;
      const path = next ?? `/v1.0/${view}?$select=${fields}&$top=50${q ? `&$search=${q}&$count=true` : ''}`;
      const data = await graph(path, !!q || !!next?.includes('$search'));
      result = { items: data?.value ?? [], next: nextPath(data?.['@odata.nextLink']) ?? null };
    }
    await client.from('audit_logs').insert({ action: 'entra_directory_read', table_name: 'microsoft_entra', record_id: view, performed_by: auth.user.email, reason: 'Administrator viewed Microsoft 365 staff/devices', record_data: { view, search: search ?? null, paged: !!next } });
    return reply({ ok: true, ...result });
  } catch (e) {
    return reply({ ok: false, error: e instanceof Error ? e.message : 'Microsoft 365 could not be reached' });
  }
});
