export function retiredMessageResponse(req: Request, corsHeaders: Record<string, string>): Response {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  return new Response(JSON.stringify({
    ok: false,
    success: false,
    error: 'This manual sender is retired. Use Settings message tests or the normal notification workflow.',
  }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}