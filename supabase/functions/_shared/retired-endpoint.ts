// Retired one-off endpoint: never read the request, look up staff, or call a provider.
export function retiredEndpointResponse(req: Request): Response {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  return new Response(JSON.stringify({ ok: false, success: false, error: 'This one-off endpoint is retired.' }),
    { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });
}
