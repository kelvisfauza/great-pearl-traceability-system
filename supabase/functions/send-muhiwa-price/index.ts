const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Retired one-off sender: never parse destinations/content or invoke a provider.
// Normal price broadcasts remain in the existing saved-price workflow.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  return new Response(JSON.stringify({
    ok: false,
    error: 'This one-off price sender is retired. Use the normal supplier price broadcast workflow.',
  }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});