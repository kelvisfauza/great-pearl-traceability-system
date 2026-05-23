import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

// FCM HTTP v1 push for incoming group calls.
// Required secret: FCM_SERVICE_ACCOUNT_JSON (Google service account JSON, full file contents)

interface Body {
  callId: string;
  conversationId?: string;
  callerName?: string;
  callerId?: string;
  kind?: 'audio' | 'video';
  calleeUserIds: string[];
}

const SA_RAW = Deno.env.get('FCM_SERVICE_ACCOUNT_JSON') ?? '';

async function getAccessToken(): Promise<{ token: string; projectId: string }> {
  if (!SA_RAW) throw new Error('FCM_SERVICE_ACCOUNT_JSON not configured');
  const sa = JSON.parse(SA_RAW);
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };
  const enc = (o: unknown) =>
    btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  const unsigned = `${enc(header)}.${enc(claim)}`;

  // Import PEM private key
  const pem = sa.private_key.replace(/-----[^-]+-----/g, '').replace(/\s/g, '');
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    'pkcs8',
    der,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned)),
  );
  const sigB64 = btoa(String.fromCharCode(...sig))
    .replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  const jwt = `${unsigned}.${sigB64}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const json = await res.json();
  if (!res.ok) throw new Error('FCM token exchange failed: ' + JSON.stringify(json));
  return { token: json.access_token, projectId: sa.project_id };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const body = (await req.json()) as Body;
    if (!body?.callId || !Array.isArray(body?.calleeUserIds) || body.calleeUserIds.length === 0) {
      return new Response(
        JSON.stringify({ ok: false, error: 'callId and calleeUserIds[] required' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: tokens, error } = await supabase
      .from('device_tokens')
      .select('token, platform, user_id')
      .in('user_id', body.calleeUserIds);
    if (error) throw error;

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, sent: 0, note: 'no device tokens registered' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { token: accessToken, projectId } = await getAccessToken();
    const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

    const dataPayload = {
      type: 'incoming_call',
      callId: body.callId,
      conversationId: body.conversationId ?? '',
      callerName: body.callerName ?? 'Caller',
      callerId: body.callerId ?? '',
      kind: body.kind ?? 'audio',
    };

    let sent = 0;
    const failures: Array<{ token: string; error: string }> = [];
    await Promise.all(
      tokens.map(async (t: any) => {
        const message: any = {
          message: {
            token: t.token,
            data: dataPayload,
            android: {
              priority: 'HIGH',
              ttl: '45s',
            },
            apns: {
              headers: { 'apns-priority': '10', 'apns-push-type': 'voip' },
              payload: { aps: { 'content-available': 1 } },
            },
          },
        };
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(message),
        });
        if (res.ok) {
          sent++;
        } else {
          const txt = await res.text();
          failures.push({ token: t.token.slice(0, 16) + '…', error: txt });
          // Clean up dead tokens
          if (res.status === 404 || /UNREGISTERED|INVALID_ARGUMENT/.test(txt)) {
            await supabase.from('device_tokens').delete().eq('token', t.token);
          }
        }
      }),
    );

    return new Response(
      JSON.stringify({ ok: true, sent, failures: failures.length, details: failures }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});