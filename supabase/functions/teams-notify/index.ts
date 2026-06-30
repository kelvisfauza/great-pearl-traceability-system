import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

// Channel routing for Great Pearl Coffee Factory Microsoft Teams
const CHANNELS = {
  hr: {
    teamId: 'e3bd8a62-6656-4e32-af0a-d1d4f0c21643',
    channelId: '19:7fc74f07ff3643da93f757c38dfeabba@thread.tacv2',
    label: 'HR',
  },
  quality: {
    teamId: 'e8928a0c-b4c4-4ebd-9b48-c600166d95d9',
    channelId: '19:Ssq3nWgyXzRMtXEQ1EbXTB8LusjDpz7rcQkqajXx0SY1@thread.tacv2',
    label: 'QUALITY DEPARTMENT',
  },
  trade: {
    teamId: '50b306c9-e6b2-431f-9776-904becb1646f',
    channelId: '19:z2fTOPPXPDaRD-D8wpJ9HVkMNFaK-mmA63_4ICKOtys1@thread.tacv2',
    label: 'TRADE TEAM',
  },
} as const;

type ChannelKey = keyof typeof CHANNELS;

const GATEWAY = 'https://connector-gateway.lovable.dev/microsoft_teams';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const channel = body.channel as ChannelKey;
    const title = typeof body.title === 'string' ? body.title : '';
    const message = typeof body.message === 'string' ? body.message : '';
    const rawHtml = typeof body.html === 'string' ? body.html : '';
    const actions = Array.isArray(body.actions) ? body.actions as Array<{ label: string; url: string }> : [];
    const replyToMessageId = typeof body.replyToMessageId === 'string' ? body.replyToMessageId : '';

    if (!channel || !CHANNELS[channel]) {
      return new Response(JSON.stringify({ ok: false, error: 'invalid channel' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!title && !message && !rawHtml) {
      return new Response(JSON.stringify({ ok: false, error: 'title or message required' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const lovableKey = Deno.env.get('LOVABLE_API_KEY');
    const teamsKey = Deno.env.get('MICROSOFT_TEAMS_API_KEY');
    if (!lovableKey || !teamsKey) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Teams connector not configured' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { teamId, channelId } = CHANNELS[channel];
    const actionsHtml = actions.length
      ? `<div style="margin-top:12px">${actions
          .filter((a) => a && typeof a.label === 'string' && typeof a.url === 'string')
          .map(
            (a) =>
              `<a href="${escapeHtml(a.url)}" style="display:inline-block;padding:8px 14px;margin-right:8px;background:#0F6CBD;color:#fff;border-radius:6px;text-decoration:none;font-weight:600">${escapeHtml(
                a.label,
              )}</a>`,
          )
          .join('')}</div>`
      : '';
    const html = rawHtml ? rawHtml : `${title ? `<h3>${escapeHtml(title)}</h3>` : ''}${
      message ? `<div>${escapeHtml(message).replace(/\n/g, '<br/>')}</div>` : ''
    }${actionsHtml}`;

    const endpoint = replyToMessageId
      ? `${GATEWAY}/teams/${teamId}/channels/${encodeURIComponent(channelId)}/messages/${encodeURIComponent(replyToMessageId)}/replies`
      : `${GATEWAY}/teams/${teamId}/channels/${encodeURIComponent(channelId)}/messages`;

    const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          'X-Connection-Api-Key': teamsKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          body: { contentType: 'html', content: html },
        }),
      });

    const text = await res.text();
    if (!res.ok) {
      console.error('Teams post failed', res.status, text);
      return new Response(
        JSON.stringify({ ok: false, error: `Teams ${res.status}`, detail: text.slice(0, 500) }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let messageId: string | undefined;
    try {
      const parsed = JSON.parse(text);
      messageId = parsed?.id;
    } catch {
      // ignore parse errors
    }

    return new Response(JSON.stringify({ ok: true, messageId }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('teams-notify error', err);
    return new Response(
      JSON.stringify({ ok: false, error: (err as Error).message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});