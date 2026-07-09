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

const SUBJECT = 'INTERNAL MEMO — Meeting Reminder: New Season & Mode of Operations'

const HTML = (name: string) => `<!doctype html>
<html><body style="margin:0;padding:0;background:#eef2f7;font-family:'Helvetica Neue',Arial,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef2f7;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 6px 28px rgba(15,23,42,0.10);">
        <!-- Header band -->
        <tr><td style="background:#f4f6fb;padding:20px 28px;border-bottom:1px solid #e2e8f0;">
          <table role="presentation" width="100%"><tr>
            <td align="left" style="vertical-align:middle;">
              <img src="${LOGO_URL}" alt="Great Agro Coffee" width="52" height="52" style="border-radius:8px;vertical-align:middle;" />
              <span style="display:inline-block;margin-left:10px;vertical-align:middle;">
                <div style="font-size:18px;font-weight:800;color:#0b2a5b;letter-spacing:1px;">YEDA</div>
                <div style="font-size:10px;color:#334155;letter-spacing:2px;">COFFEE COMPANY LIMITED</div>
                <div style="font-size:10px;color:#64748b;font-style:italic;">Quality Coffee. Sustainable Future.</div>
              </span>
            </td>
            <td align="right" style="vertical-align:middle;">
              <span style="display:inline-block;background:#0b2a5b;color:#ffffff;padding:8px 14px;border-radius:6px;font-size:12px;font-weight:700;letter-spacing:2px;">📋 INTERNAL MEMO</span>
            </td>
          </tr></table>
        </td></tr>

        <!-- Hero -->
        <tr><td style="padding:34px 32px 8px;">
          <div style="font-size:36px;font-weight:900;color:#0b2a5b;line-height:1;letter-spacing:-1px;">MEETING</div>
          <div style="font-size:36px;font-weight:900;color:#1e63d0;line-height:1;letter-spacing:-1px;margin-top:2px;">REMINDER</div>
          <p style="font-size:15px;color:#334155;line-height:1.55;margin:16px 0 4px;">
            Dear <strong>${name || 'Team'}</strong>, all staff are kindly reminded of our important
            <strong>training session</strong>.
          </p>
          <div style="height:2px;width:120px;background:#1e63d0;margin:14px 0 0;"></div>
        </td></tr>

        <!-- Topic card -->
        <tr><td style="padding:20px 32px 4px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0b2a5b;border-radius:10px;">
            <tr><td style="padding:20px 22px;">
              <div style="color:#93c5fd;font-size:12px;letter-spacing:2px;font-weight:700;">TRAINING TOPIC</div>
              <div style="color:#ffffff;font-size:22px;font-weight:800;line-height:1.2;margin-top:6px;">
                NEW SEASON &amp; MODE OF OPERATIONS
              </div>
              <div style="height:1px;background:rgba(255,255,255,0.18);margin:14px 0;"></div>
              <div style="color:#dbeafe;font-size:14px;line-height:1.55;">
                Let's align, learn and prepare together for a
                <span style="color:#60a5fa;font-weight:700;">successful season</span> ahead.
              </div>
            </td></tr>
          </table>
        </td></tr>

        <!-- Details grid -->
        <tr><td style="padding:22px 32px 6px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td width="25%" align="center" style="padding:10px;">
                <div style="width:44px;height:44px;line-height:44px;border-radius:22px;background:#1e63d0;color:#fff;font-size:20px;margin:0 auto;">📅</div>
                <div style="font-size:11px;font-weight:700;color:#1e63d0;letter-spacing:1.5px;margin-top:8px;">DATE</div>
                <div style="font-size:13px;color:#0f172a;font-weight:600;margin-top:2px;">Tomorrow (Friday)</div>
                <div style="font-size:12px;color:#334155;">10 July 2026</div>
              </td>
              <td width="25%" align="center" style="padding:10px;">
                <div style="width:44px;height:44px;line-height:44px;border-radius:22px;background:#1e63d0;color:#fff;font-size:20px;margin:0 auto;">🕙</div>
                <div style="font-size:11px;font-weight:700;color:#1e63d0;letter-spacing:1.5px;margin-top:8px;">TIME</div>
                <div style="font-size:13px;color:#0f172a;font-weight:600;margin-top:2px;">10:00 AM</div>
              </td>
              <td width="25%" align="center" style="padding:10px;">
                <div style="width:44px;height:44px;line-height:44px;border-radius:22px;background:#1e63d0;color:#fff;font-size:20px;margin:0 auto;">💻</div>
                <div style="font-size:11px;font-weight:700;color:#1e63d0;letter-spacing:1.5px;margin-top:8px;">PLATFORM</div>
                <div style="font-size:13px;color:#0f172a;font-weight:600;margin-top:2px;">Microsoft Teams</div>
              </td>
              <td width="25%" align="center" style="padding:10px;">
                <div style="width:44px;height:44px;line-height:44px;border-radius:22px;background:#1e63d0;color:#fff;font-size:20px;margin:0 auto;">👥</div>
                <div style="font-size:11px;font-weight:700;color:#1e63d0;letter-spacing:1.5px;margin-top:8px;">WHO ATTENDS</div>
                <div style="font-size:13px;color:#0f172a;font-weight:600;margin-top:2px;">All Departments</div>
                <div style="font-size:12px;color:#334155;">All Staff</div>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Call to attend -->
        <tr><td style="padding:14px 32px 24px;">
          <div style="background:#f4f6fb;border-left:4px solid #1e63d0;padding:14px 18px;border-radius:6px;">
            <div style="font-size:14px;font-weight:800;color:#0b2a5b;letter-spacing:0.5px;">PLEASE JOIN ON TIME AND BE PREPARED</div>
            <div style="font-size:13px;color:#334155;margin-top:4px;">Your participation is key to our collective success.</div>
          </div>
        </td></tr>

        <!-- Values band -->
        <tr><td style="background:#0b2a5b;padding:18px 24px;">
          <table role="presentation" width="100%"><tr>
            <td align="center" style="color:#93c5fd;font-size:11px;letter-spacing:1px;">🎯 <strong style="color:#fff;">FOCUS</strong><br/><span style="color:#cbd5e1;">Stay committed</span></td>
            <td align="center" style="color:#93c5fd;font-size:11px;letter-spacing:1px;">🤝 <strong style="color:#fff;">TEAMWORK</strong><br/><span style="color:#cbd5e1;">Work together</span></td>
            <td align="center" style="color:#93c5fd;font-size:11px;letter-spacing:1px;">📈 <strong style="color:#fff;">EXCELLENCE</strong><br/><span style="color:#cbd5e1;">Deliver quality</span></td>
            <td align="center" style="color:#93c5fd;font-size:11px;letter-spacing:1px;">🛡️ <strong style="color:#fff;">INTEGRITY</strong><br/><span style="color:#cbd5e1;">Do the right thing</span></td>
          </tr></table>
          <div style="text-align:center;color:#93c5fd;font-style:italic;font-size:13px;margin-top:14px;">Together, we grow. Together, we succeed.</div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f8fafc;padding:14px 24px;text-align:center;border-top:1px solid #e2e8f0;">
          <div style="font-size:12px;color:#475569;">${SITE_NAME} — Member of Hello YEDA COFFEE COMPANY LIMITED · P.O Box 431420, Kasese, Uganda</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`

const TEXT = (name: string) => `INTERNAL MEMO — MEETING REMINDER

Dear ${name || 'Team'},

All staff are kindly reminded of our important training session.

TRAINING TOPIC: New Season & Mode of Operations

DATE: Tomorrow (Friday), 10 July 2026
TIME: 10:00 AM
PLATFORM: Microsoft Teams
WHO SHOULD ATTEND: All Departments — All Staff

Please join on time and be prepared. Your participation is key to our collective success.

Together, we grow. Together, we succeed.

— ${SITE_NAME}, Operations & HR`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  const apiKey = Deno.env.get('LOVABLE_API_KEY')
  if (!apiKey) {
    return new Response(JSON.stringify({ ok: false, error: 'no LOVABLE_API_KEY' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const { data } = await supabase.from('employees')
    .select('name, email, disabled, status').eq('status', 'Active')
  const seen = new Set<string>()
  const recipients = ((data || []) as any[])
    .filter(e => e.email && e.disabled !== true)
    .map(e => ({ name: (e.name || 'Team') as string, email: (e.email as string).trim() }))
    .filter(r => { const k = r.email.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true })

  const stamp = Date.now()
  const results: { email: string; status: string }[] = []
  for (const r of recipients) {
    try {
      const idem = `training-memo-${stamp}-${r.email.toLowerCase()}`
      await sendLovableEmail(
        { to: r.email, from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`, sender_domain: SENDER_DOMAIN,
          subject: SUBJECT, html: HTML(r.name), text: TEXT(r.name),
          purpose: 'transactional', label: 'training-memo',
          idempotency_key: idem, unsubscribe_token: token() },
        { apiKey, idempotencyKey: idem }
      )
      results.push({ email: r.email, status: 'sent' })
    } catch (e: any) {
      results.push({ email: r.email, status: `failed: ${e?.message || e}` })
    }
  }

  // Ops CC
  try {
    const opsIdem = `training-memo-${stamp}-ops`
    await sendLovableEmail(
      { to: OPERATIONS_EMAIL, from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`, sender_domain: SENDER_DOMAIN,
        subject: `[CC] ${SUBJECT}`, html: HTML('Operations'), text: TEXT('Operations'),
        purpose: 'transactional', label: 'training-memo-ops',
        idempotency_key: opsIdem, unsubscribe_token: token() },
      { apiKey, idempotencyKey: opsIdem }
    )
  } catch (e) { console.error('Ops CC failed', e) }

  const sent = results.filter(r => r.status === 'sent').length
  return new Response(JSON.stringify({ ok: true, total: results.length, sent, failed: results.length - sent, results }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})