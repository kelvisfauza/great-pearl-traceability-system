import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

// Watches the HR channel in Microsoft Teams for messages that start with
// "LEAVE" and turns them into approval_requests rows (type 'leave').
// Scheduled every 5 minutes via pg_cron; can also be invoked manually.

const GATEWAY = 'https://connector-gateway.lovable.dev/microsoft_teams';
const HR = {
  teamId: 'e3bd8a62-6656-4e32-af0a-d1d4f0c21643',
  channelId: '19:7fc74f07ff3643da93f757c38dfeabba@thread.tacv2',
};

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
  may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9,
  september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
};

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"');
}

function iso(y: string, mo: string, d: string): string | null {
  const yy = parseInt(y, 10);
  const mm = parseInt(mo, 10);
  const dd = parseInt(d, 10);
  if (!yy || mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  return `${yy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

function parseDate(input: string, fallbackYear: number): string | null {
  let s = input.trim().replace(/,$/, '');
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return iso(m[1], m[2], m[3]);
  // d/m/yyyy (Uganda convention) or m/d/yyyy — prefer d/m
  m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (m) return iso(m[3], m[2], m[1]);
  m = s.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
  if (m) return iso(m[1], m[2], m[3]);
  // 5 Oct 2026 / 5th October
  m = s.match(/^(\d{1,2})(?:st|nd|rd|th)?[\s.]+([A-Za-z]{3,9})(?:[\s,]+(\d{4}))?$/i);
  if (m && MONTHS[m[2].toLowerCase()]) return iso(String(m[4] ?? m[3] ?? fallbackYear), String(MONTHS[m[2].toLowerCase()]), m[1]);
  // Oct 5, 2026 / October 5
  m = s.match(/^([A-Za-z]{3,9})\.?[\s.]+(\d{1,2})(?:st|nd|rd|th)?(?:[\s,]+(\d{4}))?$/i);
  if (m && MONTHS[m[1].toLowerCase()]) return iso(String(m[3] ?? fallbackYear), String(MONTHS[m[1].toLowerCase()]), m[2]);
  return null;
}

interface Parsed {
  type: string;
  from: string | null;
  to: string | null;
  reason: string;
  email: string;
}

function parseLeaveMessage(text: string): Parsed | null {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return null;
  if (!/^\s*(new\s+)?leave[\s:,\-]|^\s*leave\s+(application|request)/i.test(lines[0])) {
    if (!/\bleave\b/i.test(lines[0])) return null;
  }
  const out: Parsed = { type: '', from: null, to: null, reason: '', email: '' };
  const now = new Date();
  const fallbackYear = now.getUTCFullYear();
  const unlabeledDates: string[] = [];
  for (const line of lines.slice(1)) {
    let m: RegExpMatchArray | null;
    if ((m = line.match(/^(?:leave\s*)?type\s*[:\-]\s*(.+)$/i))) out.type = m[1].trim();
    else if ((m = line.match(/^(?:from|start(?:\s*date)?)\s*[:\-]\s*(.+)$/i))) out.from = parseDate(m[1], fallbackYear);
    else if ((m = line.match(/^(?:to|end(?:\s*date)?|until)\s*[:\-]\s*(.+)$/i))) out.to = parseDate(m[1], fallbackYear);
    else if ((m = line.match(/^(?:reason|why|note)\s*[:\-]\s*(.+)$/i))) out.reason = m[1].trim();
    else if ((m = line.match(/^(?:email|work\s*email|my email)\s*[:\-]\s*(\S+@\S+)$/i))) out.email = m[1].trim();
    else {
      // unlabeled line — collect date-like tokens as fallback
      const dateToken = line.match(/(\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{4}|\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]{3,9}(?:\s+\d{4})?|[A-Za-z]{3,9}\.?\s+\d{1,2}(?:st|nd|rd|th)?(?:[\s,]+\d{4})?)/);
      if (dateToken) unlabeledDates.push(dateToken[1]);
      else if (/^[A-Za-z][A-Za-z\s'()-]{2,40}$/.test(line) && !out.type && /^(annual|sick|maternity|paternity|compassionate|study|unpaid)/i.test(line)) {
        out.type = line;
      }
    }
  }
  if (!out.from && !out.to && unlabeledDates.length >= 1) {
    if (unlabeledDates.length >= 2) {
      out.from = parseDate(unlabeledDates[0], fallbackYear);
      out.to = parseDate(unlabeledDates[1], fallbackYear);
    } else {
      out.from = parseDate(unlabeledDates[0], fallbackYear);
      out.to = out.from;
    }
  }
  if (!out.from && !out.to) return null;
  if (!out.type) out.type = 'Annual';
  return out;
}

function daysBetween(from: string, to: string): number {
  const a = Date.parse(from + 'T00:00:00Z');
  const b = Date.parse(to + 'T00:00:00Z');
  if (Number.isNaN(a) || Number.isNaN(b)) return 1;
  return Math.max(1, Math.round((b - a) / 86400000) + 1);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function replyToTeams(messageId: string, html: string): Promise<void> {
  const lovableKey = Deno.env.get('LOVABLE_API_KEY');
  const teamsKey = Deno.env.get('MICROSOFT_TEAMS_API_KEY');
  if (!lovableKey || !teamsKey) return;
  try {
    await fetch(
      `${GATEWAY}/teams/${HR.teamId}/channels/${encodeURIComponent(HR.channelId)}/messages/${encodeURIComponent(messageId)}/replies`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          'X-Connection-Api-Key': teamsKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ body: { contentType: 'html', content: html } }),
      },
    );
  } catch (e) {
    console.error('reply failed', e);
  }
}

function normalizeName(s: string): string {
  return s.toLowerCase().replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const lovableKey = Deno.env.get('LOVABLE_API_KEY');
  const teamsKey = Deno.env.get('MICROSOFT_TEAMS_API_KEY');
  if (!lovableKey || !teamsKey) {
    return new Response(JSON.stringify({ ok: false, error: 'Teams connector not configured' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    const listRes = await fetch(
      `${GATEWAY}/teams/${HR.teamId}/channels/${encodeURIComponent(HR.channelId)}/messages?$top=50&$orderby=createdDateTime desc`,
      {
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          'X-Connection-Api-Key': teamsKey,
        },
      },
    );
    if (!listRes.ok) {
      const detail = (await listRes.text()).slice(0, 500);
      console.error('teams list failed', listRes.status, detail);
      return new Response(JSON.stringify({ ok: false, error: `Teams ${listRes.status}`, detail }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const list = await listRes.json();
    const messages: any[] = Array.isArray(list.value) ? list.value : [];

    const cutoff = Date.now() - 36 * 3600 * 1000; // only look at recent messages
    const processed: Array<{ id: string; status: string; note?: string }> = [];

    for (const msg of messages) {
      try {
        const messageId: string | undefined = msg?.id;
        if (!messageId) continue;
        if (!msg?.from?.user && msg?.from?.application) continue; // bot posts — skip
        const senderName: string = msg?.from?.user?.displayName ?? 'Unknown';
        const created: number = msg?.createdDateTime ? Date.parse(msg.createdDateTime) : 0;
        if (!created || created < cutoff) continue;

        const text = stripHtml(String(msg?.body?.content ?? ''));
        if (!/\bleave\b/i.test(text)) continue;
        if (!/^\s*(new\s+)?leave\b/i.test(text.trim())) continue; // must open with LEAVE

        // idempotency: skip already-processed messages
        const { data: seen } = await supabase
          .from('teams_leave_processed')
          .select('message_id')
          .eq('message_id', messageId)
          .maybeSingle();
        if (seen) continue;

        // always mark as processed so a failed parse does not re-trigger
        await supabase.from('teams_leave_processed').insert({ message_id: messageId });

        const parsed = parseLeaveMessage(text);
        if (!parsed) {
          const note = 'Could not parse leave details';
          await supabase.from('teams_leave_processed').update({ status: 'unparsed', note }).eq('message_id', messageId);
          await replyToTeams(
            messageId,
            `<b>We saw your leave message but couldn't read the dates.</b><br/><br/>Please reply to your message with the dates on their own lines, e.g.<br/><br/><code>From: 5 Oct 2026<br/>To: 7 Oct 2026</code>`,
          );
          processed.push({ id: messageId, status: 'unparsed' });
          continue;
        }

        // match sender to an employee record
        const { data: employees } = await supabase
          .from('employees')
          .select('id, name, email, department, position, disabled')
          .limit(2000);
        const active = (employees ?? []).filter((e: any) => !e.disabled);
        let employee = null as any;
        if (parsed.email) {
          employee = active.find((e: any) => e.email?.toLowerCase() === parsed.email.toLowerCase());
        }
        if (!employee) {
          const want = normalizeName(senderName);
          if (want) {
            const matches = active.filter((e: any) => normalizeName(e.name ?? '') === want);
            if (matches.length === 1) employee = matches[0];
          }
        }
        if (!employee) {
          const note = `No employee match for Teams sender "${senderName}"`;
          await supabase.from('teams_leave_processed').update({ status: 'unmatched', note }).eq('message_id', messageId);
          await replyToTeams(
            messageId,
            `<b>We saw your leave message but couldn't match you to a staff record.</b><br/><br/>Please edit your message to include your work email on its own line, e.g.<br/><br/><code>Email: your.name@greatpearlcoffee.com</code>`,
          );
          processed.push({ id: messageId, status: 'unmatched' });
          continue;
        }

        const from = parsed.from!;
        const to = parsed.to ?? parsed.from!;
        const days = daysBetween(from, to);
        const title = `${parsed.type} - ${employee.name}`;

        // duplicate request guard: same employee + same dates not already pending
        const { data: dup } = await supabase
          .from('approval_requests')
          .select('id')
          .eq('type', 'leave')
          .eq('requestedby', employee.email)
          .eq('status', 'Pending Admin')
          .contains('details', { start_date: from, end_date: to })
          .maybeSingle();
        if (dup) {
          await supabase.from('teams_leave_processed').update({ status: 'duplicate' }).eq('message_id', messageId);
          await replyToTeams(messageId, `This leave request is already logged and pending approval — no duplicate was created.`);
          processed.push({ id: messageId, status: 'duplicate' });
          continue;
        }

        const { data: inserted, error: insertError } = await supabase
          .from('approval_requests')
          .insert({
            type: 'leave',
            title,
            description: parsed.reason || `${parsed.type} request (applied via Teams)`,
            department: employee.department,
            requestedby: employee.email,
            requestedby_name: employee.name,
            requestedby_position: employee.position,
            daterequested: new Date().toISOString(),
            amount: days,
            priority: 'medium',
            status: 'Pending Admin',
            details: {
              leave_type: parsed.type,
              start_date: from,
              end_date: to,
              days,
              reason: parsed.reason,
              submitted_via: 'teams',
              teams_hr_message_id: messageId,
              teams_sender: senderName,
            },
          })
          .select('id')
          .single();
        if (insertError) throw insertError;

        await supabase.from('teams_leave_processed').update({ status: 'created' }).eq('message_id', messageId);
        await replyToTeams(
          messageId,
          `<b>✅ Leave request logged for ${escapeHtml(employee.name)}</b><br/>${escapeHtml(parsed.type)}: ${escapeHtml(from)} to ${escapeHtml(to)} (${days} day${days !== 1 ? 's' : ''})<br/>Status: ⏳ Pending Admin — HR will approve it on the Leave Requests page.`,
        );
        processed.push({ id: messageId, status: 'created', note: employee.name });
      } catch (msgErr) {
        console.error('message processing failed', msgErr);
      }
    }

    return new Response(JSON.stringify({ ok: true, checked: messages.length, processed }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('teams-leave-inbox error', err);
    return new Response(JSON.stringify({ ok: false, error: (err as Error).message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
