// Shared Bird (MessageBird) WhatsApp sender.
// Docs: https://docs.bird.com/api/channels-api/messages
//
// Required env vars:
//   BIRD_API_KEY        — bk_... access key
//   BIRD_WORKSPACE_ID   — Bird workspace UUID
//   BIRD_CHANNEL_ID     — WhatsApp channel UUID
// Optional:
//   BIRD_WA_TEMPLATE_SLUG — approved WhatsApp template used outside the
//                           24h customer-service window

export interface BirdWhatsAppParams {
  to: string; // E.164 or local UG number; normalized here
  text?: string; // free-form text (only delivers inside a 24h session)
  templateSlug?: string; // approved template slug/name
  templateParameters?: Array<{ type: string; name?: string; text: string }>;
}

export interface BirdWhatsAppResult {
  ok: boolean;
  messageId?: string;
  status?: string;
  raw?: unknown;
  error?: string;
}

export function isBirdConfigured(): boolean {
  return !!(
    Deno.env.get('BIRD_API_KEY') &&
    Deno.env.get('BIRD_WORKSPACE_ID') &&
    Deno.env.get('BIRD_CHANNEL_ID')
  );
}

export function normalizeUgPhoneE164(phone: string): string {
  let p = (phone || '').toString().trim().replace(/[\s\-()]/g, '');
  if (p.startsWith('+')) return p;
  if (p.startsWith('0')) return '+256' + p.substring(1);
  if (p.startsWith('256')) return '+' + p;
  return '+256' + p;
}

export async function sendBirdWhatsApp(params: BirdWhatsAppParams): Promise<BirdWhatsAppResult> {
  const apiKey = Deno.env.get('BIRD_API_KEY');
  const workspaceId = Deno.env.get('BIRD_WORKSPACE_ID');
  const channelId = Deno.env.get('BIRD_CHANNEL_ID');
  if (!apiKey || !workspaceId || !channelId) {
    return { ok: false, error: 'Bird not configured (BIRD_API_KEY / BIRD_WORKSPACE_ID / BIRD_CHANNEL_ID)' };
  }

  const to = normalizeUgPhoneE164(params.to);

  const body: Record<string, unknown> = {
    receiver: { contacts: [{ identifierValue: to }] },
  };

  const templateSlug = params.templateSlug || Deno.env.get('BIRD_WA_TEMPLATE_SLUG');
  if (templateSlug) {
    body.template = {
      slug: templateSlug,
      components: [
        {
          type: 'body',
          parameters: params.templateParameters || [],
        },
      ],
    };
  } else if (params.text) {
    body.body = { type: 'text', text: { text: params.text } };
  } else {
    return { ok: false, error: 'No text or template provided' };
  }

  try {
    const res = await fetch(
      `https://api.bird.com/workspaces/${workspaceId}/channels/${channelId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `AccessKey ${apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    const text = await res.text();
    let parsed: any = {};
    try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }

    if (res.ok) {
      return { ok: true, messageId: parsed?.id, status: parsed?.status, raw: parsed };
    }
    console.error('Bird WhatsApp send failed:', res.status, text);
    return { ok: false, status: String(res.status), raw: parsed, error: text };
  } catch (err) {
    console.error('Bird WhatsApp request error:', (err as Error).message);
    return { ok: false, error: (err as Error).message };
  }
}
