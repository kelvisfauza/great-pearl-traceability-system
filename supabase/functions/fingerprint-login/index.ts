const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Sign-in already stays disabled until real assertion verification is available.
// Do not look up an account or expose enrolled credential identifiers beforehand.
Deno.serve((req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  return new Response(JSON.stringify({
    ok: false,
    error: 'Fingerprint sign-in is temporarily unavailable. Please sign in with your password.',
  }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
