/**
 * Shared-secret check for IPN/payment callbacks (fail-closed).
 * The callback URLs we hand to Yo / GosentePay carry ?secret=<ipnSecret()>,
 * so only notifications for payments we started are accepted.
 * IPN_CALLBACK_SECRET overrides the derived value when configured.
 */
export async function ipnSecret(): Promise<string> {
  const env = Deno.env.get("IPN_CALLBACK_SECRET");
  if (env) return env;
  const data = new TextEncoder().encode(`ipn-callback:${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""}`);
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
  return Array.from(h.slice(0, 20)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Append the callback secret to a notification URL. */
export async function withIpnSecret(url: string): Promise<string> {
  return `${url}${url.includes("?") ? "&" : "?"}secret=${await ipnSecret()}`;
}

export async function checkIpnSecret(req: Request, corsHeaders: Record<string, string>): Promise<Response | null> {
  const expected = await ipnSecret();
  const url = new URL(req.url);
  const provided = req.headers.get("x-callback-secret") || url.searchParams.get("secret") || "";
  if (provided.length !== expected.length) return reject(corsHeaders);
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
  if (diff !== 0) return reject(corsHeaders);
  return null;
}

function reject(corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify({ error: "Unauthorized callback" }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
