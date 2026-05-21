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
    const apiKey = (Deno.env.get('METERED_API_KEY') || '').trim();
    const subdomain = 'greatagrocoffee';
    if (!apiKey) {
      return new Response(JSON.stringify({ ok: false, error: 'METERED_API_KEY missing', iceServers: [] }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log('Using key len=', apiKey.length, 'prefix=', apiKey.slice(0, 4), 'suffix=', apiKey.slice(-4));
    const url = `https://${subdomain}.metered.live/api/v1/turn/credentials?apiKey=${encodeURIComponent(apiKey)}`;
    const r = await fetch(url);
    if (!r.ok) {
      const txt = await r.text();
      console.error('Metered API error', r.status, txt);
      return new Response(JSON.stringify({ ok: false, error: `Metered ${r.status}: ${txt}`, iceServers: [] }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const iceServers = await r.json();
    console.log('Fetched', Array.isArray(iceServers) ? iceServers.length : 0, 'ICE servers');
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