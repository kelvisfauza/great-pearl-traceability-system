const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  try {
    const secretKey = (Deno.env.get('METERED_API_KEY') || '').trim();
    const subdomain = 'greatagrocoffee';
    if (!secretKey) {
      return new Response(JSON.stringify({ ok: false, error: 'METERED_API_KEY missing', iceServers: [] }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    // Step 1: create a short-lived TURN credential using the account Secret Key
    const createUrl = `https://${subdomain}.metered.live/api/v1/turn/credential?secretKey=${encodeURIComponent(secretKey)}`;
    const createRes = await fetch(createUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expiryInSeconds: 86400, label: 'webrtc-call' }),
    });
    if (!createRes.ok) {
      const txt = await createRes.text();
      console.error('Metered create credential failed', createRes.status, txt);
      return new Response(JSON.stringify({ ok: false, error: `Metered create ${createRes.status}: ${txt}`, iceServers: [] }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const cred = await createRes.json();
    const username = cred.username;
    const password = cred.password;
    if (!username || !password) {
      return new Response(JSON.stringify({ ok: false, error: 'Missing username/password in Metered response', iceServers: [] }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    // Step 2: build standard ICE servers array
    const iceServers = [
      { urls: 'stun:stun.relay.metered.ca:80' },
      { urls: 'turn:global.relay.metered.ca:80', username, credential: password },
      { urls: 'turn:global.relay.metered.ca:80?transport=tcp', username, credential: password },
      { urls: 'turn:global.relay.metered.ca:443', username, credential: password },
      { urls: 'turns:global.relay.metered.ca:443?transport=tcp', username, credential: password },
    ];
    console.log('Issued TURN credential for user', username);
    return new Response(JSON.stringify({ ok: true, iceServers }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('get-ice-servers exception', e);
    return new Response(JSON.stringify({ ok: false, error: String(e), iceServers: [] }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});