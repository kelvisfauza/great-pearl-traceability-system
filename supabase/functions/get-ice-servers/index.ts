// Returns a list of ICE servers (STUN + TURN) for WebRTC voice/video calls.
// Resolution order:
//   1) If METERED_API_KEY (+ optional METERED_APP_NAME) is set, fetch
//      time-limited TURN credentials from Metered's REST API (most reliable).
//   2) Else if TURN_URL + TURN_USERNAME + TURN_CREDENTIAL secrets are set
//      (e.g. Twilio NTS, Cloudflare TURN, self-hosted coturn), use those.
//   3) Otherwise fall back to multiple public STUN servers + the legacy
//      OpenRelay TURN cluster (best-effort; may be flaky).
//
// We always respond 200 with `{ iceServers }` so the client never sees a
// fatal error from this helper — calls degrade to STUN-only if everything
// else fails.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const FALLBACK_ICE = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
  { urls: 'stun:global.stun.twilio.com:3478' },
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turns:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const meteredKey = Deno.env.get('METERED_API_KEY');
    const meteredApp = Deno.env.get('METERED_APP_NAME');
    if (meteredKey && meteredApp) {
      const url = `https://${meteredApp}.metered.live/api/v1/turn/credentials?apiKey=${meteredKey}`;
      const res = await fetch(url);
      if (res.ok) {
        const iceServers = await res.json();
        return new Response(
          JSON.stringify({ iceServers, source: 'metered' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      console.warn('Metered TURN fetch failed', res.status, await res.text());
    }

    const turnUrl = Deno.env.get('TURN_URL');
    const turnUser = Deno.env.get('TURN_USERNAME');
    const turnCred = Deno.env.get('TURN_CREDENTIAL');
    if (turnUrl && turnUser && turnCred) {
      const iceServers = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun.cloudflare.com:3478' },
        { urls: turnUrl.split(','), username: turnUser, credential: turnCred },
      ];
      return new Response(
        JSON.stringify({ iceServers, source: 'custom' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ iceServers: FALLBACK_ICE, source: 'fallback' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error('get-ice-servers error', e);
    return new Response(
      JSON.stringify({ iceServers: FALLBACK_ICE, source: 'error-fallback' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});