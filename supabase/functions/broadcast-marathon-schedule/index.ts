import { sendLovableEmail } from 'npm:@lovable.dev/email-js@0.0.4'
import { createClient } from 'npm:@supabase/supabase-js@2.49.1'

const SITE_NAME = 'Great Agro Coffee'
const SENDER_DOMAIN = 'notify.greatpearlcoffeesystem.site'
const FROM_DOMAIN = 'notify.greatpearlcoffeesystem.site'
const OPERATIONS_EMAIL = 'operations@greatpearlcoffee.com'
const BASE = 'https://great-pearl-traceability-system.lovable.app'
const LOGO_URL = `${BASE}/lovable-uploads/great-agro-coffee-logo.png`
const HERO_URL = `${BASE}/lovable-uploads/rwenzori-marathon-2026.jpg`
const SECOND_URL = `${BASE}/lovable-uploads/rwenzori-marathon-finish.jpg`

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function token(): string {
  const b = new Uint8Array(32); crypto.getRandomValues(b)
  return Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('')
}

function html(name: string): string {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f4f6f4;font-family:'Segoe UI',Arial,sans-serif;color:#1f2937;">
  <table width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6f4;padding:28px 14px;"><tr><td align="center">
    <table width="640" cellspacing="0" cellpadding="0" style="max-width:640px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 22px rgba(20,60,30,0.08);">
      <tr><td style="padding:18px 26px 12px;">
        <table cellspacing="0" cellpadding="0"><tr>
          <td style="width:62px;"><img src="${LOGO_URL}" width="52" height="52" style="border-radius:8px;" alt="${SITE_NAME}" /></td>
          <td><div style="font-size:18px;font-weight:700;color:#14532d;">${SITE_NAME}</div>
              <div style="font-size:12px;color:#6b7280;">A member of YEDA COFFEE COMPANY LIMITED</div></td>
        </tr></table>
      </td></tr>
      <tr><td style="height:4px;background:#166534;font-size:1px;line-height:4px;">&nbsp;</td></tr>
      <tr><td><img src="${HERO_URL}" width="640" style="width:100%;display:block;" alt="Rwenzori Marathon" /></td></tr>
      <tr><td style="padding:26px 28px;font-size:15px;line-height:1.7;">
        <h1 style="font-size:23px;margin:0 0 16px;color:#111827;">Delayed Start Today — Work Begins at 11:00 AM</h1>
        <p>Dear <strong>${name}</strong>,</p>
        <p>Due to the <strong>Tusker Lite Rwenzori Marathon</strong> taking place today, major roads are closed and movement across town is heavily affected.</p>
        <table width="100%" cellspacing="0" cellpadding="0" style="margin:18px 0;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
          <tr style="background:#166534;color:#fff;">
            <td style="padding:10px 12px;font-size:13px;font-weight:700;text-transform:uppercase;">Item</td>
            <td style="padding:10px 12px;font-size:13px;font-weight:700;text-transform:uppercase;">Today's Arrangement</td>
          </tr>
          <tr><td style="padding:10px 12px;border-top:1px solid #e5e7eb;">Reporting time</td><td style="padding:10px 12px;border-top:1px solid #e5e7eb;"><strong>11:00 AM</strong></td></tr>
          <tr style="background:#f9fafb;"><td style="padding:10px 12px;border-top:1px solid #e5e7eb;">Closing time</td><td style="padding:10px 12px;border-top:1px solid #e5e7eb;"><strong>7:30 PM</strong></td></tr>
          <tr><td style="padding:10px 12px;border-top:1px solid #e5e7eb;">Reason</td><td style="padding:10px 12px;border-top:1px solid #e5e7eb;">Tusker Lite Rwenzori Marathon — road closures</td></tr>
          <tr style="background:#f9fafb;"><td style="padding:10px 12px;border-top:1px solid #e5e7eb;">Attendance</td><td style="padding:10px 12px;border-top:1px solid #e5e7eb;">Mandatory for all staff</td></tr>
        </table>
        <img src="${SECOND_URL}" width="584" style="width:100%;display:block;border-radius:8px;margin:6px 0 18px;" alt="Rwenzori Marathon finish line" />
        <table width="100%" cellspacing="0" cellpadding="0" style="background:#fef2f2;border-left:4px solid #dc2626;border-radius:6px;margin:0 0 18px;">
          <tr><td style="padding:14px 16px;font-size:14px;color:#7f1d1d;">
            <strong>Please note:</strong> Failure to report and complete the extended hours will attract an <strong>undertime deduction from your wallet</strong>, as per company attendance policy.
          </td></tr>
        </table>
        <p>Kindly plan your movement early, avoid the marathon route, and clock in on time at 11:00 AM.</p>
        <p style="margin-top:22px;">Thank you for your cooperation,<br/><strong>${SITE_NAME} — Operations &amp; HR</strong></p>
      </td></tr>
      <tr><td style="background:#faf6ef;padding:16px 28px;border-top:1px solid #ece4d4;text-align:center;font-size:12px;color:#6b4423;">
        P.O Box 431420, Kasese, Uganda · Operations Office: +256 393 101 103
      </td></tr>
    </table>
  </td></tr></table></body></html>`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  const apiKey = Deno.env.get('LOVABLE_API_KEY')
  if (!apiKey) return new Response(JSON.stringify({ ok: false, error: 'no LOVABLE_API_KEY' }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  let body: any = {}
  try { body = await req.json() } catch {}
  const extra: string[] = Array.isArray(body.extraEmails) ? body.extraEmails : []

  const { data } = await supabase.from('employees')
    .select('name, email, disabled').eq('status', 'Active')

  const seen = new Set<string>()
  const recipients = ((data || []) as any[])
    .filter(e => e.email && e.disabled !== true)
    .map(e => ({ name: (e.name as string) || 'Team', email: (e.email as string).trim() }))
    .filter(r => { const k = r.email.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true })

  for (const em of extra) {
    const k = em.trim().toLowerCase()
    if (k && !seen.has(k)) { seen.add(k); recipients.push({ name: 'Team', email: em.trim() }) }
  }

  const subject = 'Today: Work Starts at 11:00 AM (Tusker Lite Rwenzori Marathon) — Closing 7:30 PM'
  const text = `Due to the Tusker Lite Rwenzori Marathon and the resulting road closures, work today starts at 11:00 AM and is extended to 7:30 PM.
Attendance is mandatory. Failure to attend will attract an undertime deduction from your wallet.
— ${SITE_NAME}, Operations & HR`

  const stamp = Date.now()
  const results: { email: string; status: string }[] = []
  for (const r of recipients) {
    const idem = `marathon-delay-${stamp}-${r.email.toLowerCase()}`
    try {
      await sendLovableEmail(
        { to: r.email, from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`, sender_domain: SENDER_DOMAIN,
          subject, html: html(r.name), text, purpose: 'transactional',
          label: 'marathon-delay-notice', idempotency_key: idem, unsubscribe_token: token() },
        { apiKey, idempotencyKey: idem }
      )
      results.push({ email: r.email, status: 'sent' })
    } catch (e: any) {
      results.push({ email: r.email, status: `failed: ${e?.message || e}` })
    }
  }

  try {
    const opsIdem = `marathon-delay-${stamp}-ops-cc`
    await sendLovableEmail(
      { to: OPERATIONS_EMAIL, from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`, sender_domain: SENDER_DOMAIN,
        subject: `[CC] ${subject}`, html: html('Operations'), text, purpose: 'transactional',
        label: 'marathon-delay-notice-ops', idempotency_key: opsIdem, unsubscribe_token: token() },
      { apiKey, idempotencyKey: opsIdem }
    )
  } catch (e) { console.error('Ops CC failed', e) }

  const sent = results.filter(r => r.status === 'sent').length
  return new Response(JSON.stringify({ ok: true, total: results.length, sent, failed: results.length - sent, results }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})
