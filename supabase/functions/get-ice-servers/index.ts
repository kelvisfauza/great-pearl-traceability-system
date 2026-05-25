const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  const json = (body: unknown) =>
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  // Helper: build manual TURN entries from env secrets (TURN_URLS, TURN_USERNAME, TURN_CREDENTIAL)
  const getManualTurn = (): any[] | null => {
    const urlsRaw = (Deno.env.get('TURN_URLS') || '').trim();
    const username = (Deno.env.get('TURN_USERNAME') || '').trim();
    const credential = (Deno.env.get('TURN_CREDENTIAL') || '').trim();
    if (!urlsRaw || !username || !credential) return null;
    const urls = urlsRaw.split(',').map((u) => u.trim()).filter(Boolean);
    if (urls.length === 0) return null;
    console.log('Using manual TURN credentials from env', { urlCount: urls.length, username });
    return [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls, username, credential },
    ];
  };

  // Helper: fetch Cloudflare Calls TURN credentials as fallback
  const getCloudflareIce = async (): Promise<any[] | null> => {
    const tokenId = (Deno.env.get('CLOUDFLARE_TURN_TOKEN_ID') || '').trim();
    const apiToken = (Deno.env.get('CLOUDFLARE_TURN_API_TOKEN') || '').trim();
    if (!tokenId || !apiToken) return null;
    try {
      const res = await fetch(
        `https://rtc.live.cloudflare.com/v1/turn/keys/${tokenId}/credentials/generate`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ttl: 86400 }),
        }
      );
      if (!res.ok) {
        console.error('Cloudflare TURN failed', res.status, await res.text());
        return null;
      }
      const data = await res.json();
      // Cloudflare returns { iceServers: { urls: [...], username, credential } }
      const cf = data.iceServers;
      if (!cf) return null;
      console.log('Issued Cloudflare TURN credential');
      return [
        { urls: 'stun:stun.cloudflare.com:3478' },
        { urls: cf.urls, username: cf.username, credential: cf.credential },
      ];
    } catch (e) {
      console.error('Cloudflare TURN exception', e);
      return null;
    }
  };

  try {
    // Manual TURN env vars take highest priority (user-controlled, always reliable)
    const manual = getManualTurn();
    if (manual) {
      const cfExtra = await getCloudflareIce();
      if (cfExtra) manual.push(...cfExtra);
      return json({ ok: true, iceServers: manual, provider: cfExtra ? 'manual+cloudflare' : 'manual' });
    }

    // Cloudflare TURN is the preferred provider (reliable, generous free tier)
    const cfFirst = await getCloudflareIce();
    if (cfFirst) return json({ ok: true, iceServers: cfFirst, provider: 'cloudflare' });

    const secretKey = (Deno.env.get('METERED_API_KEY') || '').trim();
    const subdomain = 'greatagrocoffee';
    if (!secretKey) {
      return json({ ok: false, error: 'METERED_API_KEY missing and no Cloudflare fallback', iceServers: [] });
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
      const cfIce = await getCloudflareIce();
      if (cfIce) return json({ ok: true, iceServers: cfIce, provider: 'cloudflare-fallback' });
      return json({ ok: false, error: `Metered create ${createRes.status}: ${txt}`, iceServers: [] });
    }
    const cred = await createRes.json();
    const username = cred.username;
    const password = cred.password;
    if (!username || !password) {
      const cfIce = await getCloudflareIce();
      if (cfIce) return json({ ok: true, iceServers: cfIce, provider: 'cloudflare-fallback' });
      return json({ ok: false, error: 'Missing username/password in Metered response', iceServers: [] });
    }
    // Step 2: build standard ICE servers array
    const iceServers = [
      { urls: 'stun:stun.relay.metered.ca:80' },
      { urls: 'turn:global.relay.metered.ca:80', username, credential: password },
      { urls: 'turn:global.relay.metered.ca:80?transport=tcp', username, credential: password },
      { urls: 'turn:global.relay.metered.ca:443', username, credential: password },
      { urls: 'turns:global.relay.metered.ca:443?transport=tcp', username, credential: password },
    ];
    // Also append Cloudflare relays for extra resiliency across networks
    const cfIce = await getCloudflareIce();
    if (cfIce) iceServers.push(...cfIce);
    console.log('Issued TURN credential for user', username);
    return json({ ok: true, iceServers, provider: cfIce ? 'metered+cloudflare' : 'metered' });
  } catch (e) {
    console.error('get-ice-servers exception', e);
    const cfIce = await getCloudflareIce();
    if (cfIce) return json({ ok: true, iceServers: cfIce, provider: 'cloudflare-fallback' });
    return json({ ok: false, error: String(e), iceServers: [] });
  }
});