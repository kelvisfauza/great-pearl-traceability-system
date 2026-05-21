import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  try {
    const apiKey = Deno.env.get('METERED_API_KEY');
    const subdomain = 'greatagrocoffee';
    if (!apiKey) {
      return new Response(JSON.stringify({ ok: false, error: 'METERED_API_KEY missing', iceServers: [] }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const url = `https://${subdomain}.metered.live/api/v1/turn/credentials?apiKey=${apiKey}`;
    const r = await fetch(url);
    const iceServers = await r.json();
    return new Response(JSON.stringify({ ok: true, iceServers }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e), iceServers: [] }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});