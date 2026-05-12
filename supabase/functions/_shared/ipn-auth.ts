/**
 * Optional shared-secret check for IPN/payment callbacks.
 * If IPN_CALLBACK_SECRET is configured, the caller MUST present it via
 * the X-Callback-Secret header or ?secret= query param. Otherwise the
 * request is rejected with 401.
 *
 * If the env var is not configured, the check is a no-op (returns null)
 * so existing integrations keep working until the operator configures it.
 *
 * Returns null when authorized (or unconfigured), or a Response when blocked.
 */
export function checkIpnSecret(req: Request, corsHeaders: Record<string, string>): Response | null {
  const expected = Deno.env.get("IPN_CALLBACK_SECRET");
  if (!expected) return null;

  const url = new URL(req.url);
  const fromQuery = url.searchParams.get("secret") || "";
  const fromHeader = req.headers.get("x-callback-secret") || "";
  const provided = fromHeader || fromQuery;

  // Constant-time compare
  if (provided.length !== expected.length) {
    return reject(corsHeaders);
  }
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
  }
  if (diff !== 0) return reject(corsHeaders);
  return null;
}

function reject(corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify({ error: "Unauthorized callback" }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
