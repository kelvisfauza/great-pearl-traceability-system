import { sendLovableEmail } from 'npm:@lovable.dev/email-js@0.0.4'
import { createClient } from 'npm:@supabase/supabase-js@2.49.1'

const SITE_NAME = 'Great Agro Coffee'
const SENDER_DOMAIN = 'notify.greatpearlcoffeesystem.site'
const FROM_DOMAIN = 'notify.greatpearlcoffeesystem.site'
const OPERATIONS_EMAIL = 'operations@greatpearlcoffee.com'
const LOGO_URL = 'https://great-pearl-traceability-system.lovable.app/lovable-uploads/great-agro-coffee-logo.png'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function token(): string {
  const b = new Uint8Array(32); crypto.getRandomValues(b)
  return Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('')
}

function shell(headline: string, subtitle: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f5f1ea;font-family:'Helvetica Neue',Arial,sans-serif;color:#1f2937;">
  <table width="100%" cellspacing="0" cellpadding="0" style="background:#f5f1ea;padding:32px 16px;"><tr><td align="center">
    <table width="640" cellspacing="0" cellpadding="0" style="max-width:640px;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(60,40,20,0.08);">
      <tr><td style="background:linear-gradient(135deg,#3d2817 0%,#6b4423 100%);padding:28px 32px;text-align:center;">
        <img src="${LOGO_URL}" width="56" height="56" style="border-radius:10px;background:#fff;padding:4px;margin-bottom:8px;" />
        <div style="color:#f5e6c8;font-size:12px;letter-spacing:2px;text-transform:uppercase;">${SITE_NAME}</div>
        <h1 style="color:#fff;font-size:22px;margin:8px 0 0;font-weight:600;">${headline}</h1>
        <div style="color:#f5e6c8;font-size:13px;margin-top:6px;">${subtitle}</div>
      </td></tr>
      <tr><td style="padding:28px 32px;font-size:15px;line-height:1.65;">${bodyHtml}</td></tr>
      <tr><td style="background:#faf6ef;padding:18px 32px;border-top:1px solid #ece4d4;text-align:center;font-size:12px;color:#6b4423;">
        ${SITE_NAME} — Operations & HR
      </td></tr>
    </table>
  </td></tr></table></body></html>`
}

async function listActiveEmployees(supabase: any, department?: string) {
  let q = supabase.from('employees').select('name, email, department, disabled').eq('status', 'Active')
  if (department) q = q.eq('department', department)
  const { data } = await q
  const rows = ((data || []) as any[])
    .filter(e => e.email && e.disabled !== true)
    .map(e => ({ name: (e.name as string) || 'Team', email: (e.email as string).trim(), department: e.department }))
  const seen = new Set<string>()
  return rows.filter(r => { const k = r.email.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  const apiKey = Deno.env.get('LOVABLE_API_KEY')
  if (!apiKey) return new Response(JSON.stringify({ ok: false, error: 'no LOVABLE_API_KEY' }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  let body: any = {}
  try { body = await req.json() } catch {}
  const kind: 'announcement' | 'reminder' = body.kind || 'announcement'
  const meetingId: string | undefined = body.meeting_id
  const department: string | undefined = body.department

  let recipients: { name: string; email: string; department?: string | null }[] = []
  let subject = ''
  let html = ''
  let text = ''
  let label = ''

  if (kind === 'announcement') {
    recipients = await listActiveEmployees(supabase)
    subject = `New: Mandatory Monday & Tuesday Meetings — Starting Now`
    label = 'meetings-announcement'
    const inner = `
      <p>Dear <strong>{{NAME}}</strong>,</p>
      <p>To strengthen alignment across the company, ${SITE_NAME} is launching two recurring team meetings, effective immediately:</p>
      <table width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0 22px;border:1px solid #ece4d4;border-radius:10px;overflow:hidden;">
        <tr><td style="background:#fff7ed;padding:14px 16px;border-bottom:1px solid #fed7aa;">
          <div style="font-weight:700;color:#9a3412;">📣 General Monday Meeting</div>
          <div style="font-size:13px;color:#7c2d12;margin-top:4px;">Every Monday at 9:00 AM (Africa/Kampala) — for the whole company.</div>
        </td></tr>
        <tr><td style="background:#ecfeff;padding:14px 16px;">
          <div style="font-weight:700;color:#155e75;">🧩 Departmental Tuesday Meeting</div>
          <div style="font-size:13px;color:#155e75;margin-top:4px;">Every Tuesday at 9:00 AM (Africa/Kampala) — by department.</div>
        </td></tr>
      </table>
      <p><strong>How it works:</strong></p>
      <ul style="font-size:14px;line-height:1.7;color:#374151;padding-left:20px;margin:0 0 18px;">
        <li>The system auto-starts the call at 9:00 AM.</li>
        <li>When you log in during a meeting window, you'll see a <strong>Join / Decline</strong> prompt.</li>
        <li>Attendance is automatically tracked. Calls are recorded by the host for accountability.</li>
        <li>Any admin can end the meeting once business is concluded.</li>
      </ul>
      <p>Please plan to be online by <strong>8:55 AM</strong> on Mondays and Tuesdays. Department managers, prepare a 5-minute brief for your team.</p>
      <p style="margin-top:22px;">Thank you,<br/><strong>${SITE_NAME} — Operations & HR</strong></p>`
    html = shell('Company Meetings Now Automated',
      'General Mondays · Departmental Tuesdays · 9:00 AM EAT',
      inner)
    text = `Mandatory recurring meetings launched.
- General Monday Meeting: every Monday 9:00 AM (Africa/Kampala) — whole company
- Departmental Tuesday Meeting: every Tuesday 9:00 AM (Africa/Kampala) — your department

The system auto-starts the call and prompts you to Join/Decline on login. Attendance is tracked and calls are recorded.

— ${SITE_NAME}, Operations & HR`
  } else {
    // reminder for a specific meeting
    if (!meetingId) {
      return new Response(JSON.stringify({ ok: false, error: 'meeting_id required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const { data: m } = await supabase.from('scheduled_meetings')
      .select('title, kind, department, started_at').eq('id', meetingId).maybeSingle()
    if (!m) return new Response(JSON.stringify({ ok: false, error: 'meeting not found' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    recipients = await listActiveEmployees(supabase, m.department || department)
    subject = `🔔 ${m.title} is live now — join from your dashboard`
    label = `meeting-reminder-${(m.kind || 'meeting')}`

    const inner = `
      <p>Dear <strong>{{NAME}}</strong>,</p>
      <p>The <strong>${m.title}</strong> has just started. Please log in to the system to join the call.</p>
      <table width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0 22px;background:#f0fdf4;border-left:4px solid #16a34a;border-radius:6px;">
        <tr><td style="padding:14px 16px;font-size:14px;color:#14532d;">
          When you open the dashboard you'll see a <strong>Join meeting</strong> prompt. Click Join to enter.
        </td></tr>
      </table>
      <p style="font-size:13px;color:#6b7280;">Attendance is logged automatically. Calls are recorded.</p>
      <p style="margin-top:22px;"><strong>${SITE_NAME} — Operations</strong></p>`
    html = shell(m.title, 'Live now · 9:00 AM EAT', inner)
    text = `${m.title} is live now. Log in to your dashboard to join.`
  }

  const stamp = Date.now()
  const results: { email: string; status: string }[] = []

  for (const r of recipients) {
    try {
      const idem = `${label}-${stamp}-${r.email.toLowerCase()}`
      await sendLovableEmail(
        { to: r.email, from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`, sender_domain: SENDER_DOMAIN,
          subject, html: html.replace('{{NAME}}', r.name), text,
          purpose: 'transactional', label, idempotency_key: idem, unsubscribe_token: token() },
        { apiKey, idempotencyKey: idem }
      )
      results.push({ email: r.email, status: 'sent' })
    } catch (e: any) {
      results.push({ email: r.email, status: `failed: ${e?.message || e}` })
    }
  }

  // Ops CC
  try {
    const opsIdem = `${label}-${stamp}-ops-cc`
    await sendLovableEmail(
      { to: OPERATIONS_EMAIL, from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`, sender_domain: SENDER_DOMAIN,
        subject: `[CC] ${subject}`, html: html.replace('{{NAME}}', 'Operations'), text,
        purpose: 'transactional', label: `${label}-ops`, idempotency_key: opsIdem, unsubscribe_token: token() },
      { apiKey, idempotencyKey: opsIdem }
    )
  } catch (e) {
    console.error('Ops CC failed', e)
  }

  const sent = results.filter(r => r.status === 'sent').length
  return new Response(JSON.stringify({ ok: true, kind, total: results.length, sent, failed: results.length - sent }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})