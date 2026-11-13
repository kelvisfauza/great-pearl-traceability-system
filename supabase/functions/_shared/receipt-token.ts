// Unguessable token bound to a receipt reference, so receipt download links
// cannot be produced just by guessing reference numbers.
export async function receiptToken(ref: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`receipt:${ref}`)));
  return Array.from(sig.slice(0, 12)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
export async function receiptLink(supaUrl: string, ref: string): Promise<string> {
  return `${supaUrl}/functions/v1/receipt-link?ref=${encodeURIComponent(ref)}&t=${await receiptToken(ref)}`;
}
