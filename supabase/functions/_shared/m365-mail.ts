// Sends one email through the company Microsoft 365 mailbox via the connector gateway.
// Returns false (never throws) so callers can fall back to the notification-domain sender.
export const M365_SENDER = 'fauzakusa@greatpearlcoffee.com';
export async function sendViaM365(to: string, subject: string, html: string, replyTo?: string): Promise<{ ok: boolean; error?: string }> {
  const gk = Deno.env.get('LOVABLE_API_KEY'); const ck = Deno.env.get('AZURE_GRAPH_API_KEY');
  if (!gk || !ck) return { ok: false, error: 'Microsoft 365 connection not configured' };
  try {
    const r = await fetch(`https://connector-gateway.lovable.dev/azure_graph/v1.0/users/${M365_SENDER}/sendMail`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${gk}`, 'X-Connection-Api-Key': ck, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: { subject, body: { contentType: 'HTML', content: html }, toRecipients: [{ emailAddress: { address: to } }], ...(replyTo ? { replyTo: [{ emailAddress: { address: replyTo } }] } : {}) }, saveToSentItems: false }),
      signal: AbortSignal.timeout(20000),
    });
    if (r.ok) return { ok: true };
    return { ok: false, error: `Microsoft returned ${r.status}: ${(await r.text()).slice(0, 200)}` };
  } catch (e) { return { ok: false, error: String((e as Error)?.message ?? e) }; }
}
