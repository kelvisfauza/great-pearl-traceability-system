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

const SUBJECT = '🕊️ Uganda Martyrs Day — Offices Closed Tomorrow (3rd June)'

const HTML = (name: string) => `<!doctype html>
<html><body style="margin:0;padding:0;background:#f5f1ea;font-family:'Helvetica Neue',Arial,sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f1ea;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(60,40,20,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#3d2817 0%,#6b4423 50%,#b45309 100%);padding:34px 32px;text-align:center;">
            <img src="${LOGO_URL}" alt="Great Agro Coffee" width="64" height="64" style="display:inline-block;border-radius:12px;background:#ffffff;padding:6px;margin-bottom:10px;" />
            <div style="color:#fde68a;font-size:12px;letter-spacing:3px;text-transform:uppercase;font-weight:700;">Wednesday · 3rd June 2026</div>
            <h1 style="color:#ffffff;font-size:30px;margin:8px 0 4px;font-weight:700;letter-spacing:1px;">UGANDA MARTYRS DAY</h1>
            <div style="color:#fef3c7;font-size:14px;font-weight:500;">A Day of Reflection &amp; Remembrance</div>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="font-size:16px;margin:0 0 16px;">Dear <strong>${name || 'Team'}</strong>,</p>
            <p style="font-size:15px;line-height:1.7;margin:0 0 18px;color:#475569;">
              Tomorrow, <strong>Wednesday 3rd June 2026</strong>, Uganda observes
              <strong>Martyrs Day</strong> — a national public holiday honouring
              the Uganda Martyrs of Namugongo.
            </p>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:18px 0;">
              <tr>
                <td style="background:#fffbeb;border:2px dashed #b45309;padding:22px 20px;border-radius:10px;text-align:center;">
                  <div style="font-size:12px;color:#92400e;letter-spacing:3px;font-weight:700;">OFFICIAL NOTICE</div>
                  <div style="font-size:22px;color:#78350f;font-weight:700;margin:6px 0 4px;">Offices Will Be Closed</div>
                  <div style="font-size:13px;color:#92400e;">No regular work activities tomorrow</div>
                </td>
              </tr>
            </table>
            <p style="font-size:15px;line-height:1.7;margin:0 0 14px;color:#475569;">
              In observance of this important day, <strong>Great Agro Coffee will
              remain closed</strong>. Take the time to rest, reflect, and spend the
              day with loved ones. Regular operations resume on
              <strong>Thursday 4th June 2026</strong>.
            </p>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:18px 0;">
              <tr>
                <td style="background:#ecfdf5;border-left:4px solid #047857;padding:16px 18px;border-radius:6px;">
                  <div style="font-weight:700;color:#064e3b;font-size:14px;margin-bottom:6px;">📈 Trade Team Notice</div>
                  <div style="font-size:13px;color:#065f46;line-height:1.6;">
                    Markets never sleep — kindly continue monitoring ICE Arabica &amp;
                    Robusta futures, FX movements and major price news, and submit
                    your daily market report as usual.
                  </div>
                </td>
              </tr>
            </table>
            <p style="font-size:14px;line-height:1.6;color:#4b5563;margin:22px 0 6px;font-style:italic;">
              May this day bring you peace and renewed strength. Stay safe and have a meaningful holiday.
            </p>
            <p style="font-size:14px;margin:18px 0 0;color:#6b4423;font-weight:600;">— Great Agro Coffee Management</p>
            <p style="font-size:12px;color:#94a3b8;margin:2px 0 0;">🌿 Kasese, Uganda</p>
          </td>
        </tr>
        <tr>
          <td style="background:#faf6ef;padding:18px 32px;border-top:1px solid #ece4d4;text-align:center;">
            <div style="font-size:11px;color:#9ca3af;">Great Agro Coffee — Kasese, Uganda · +256 393 001 626 · info@greatpearlcoffee.com</div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body></html>`

const TEXT = (name: string) => `Dear ${name || 'Team'},

UGANDA MARTYRS DAY — WEDNESDAY 3RD JUNE 2026

Tomorrow, Uganda observes Martyrs Day, a national public holiday honouring the Uganda Martyrs of Namugongo.

OFFICIAL NOTICE: Great Agro Coffee offices will be CLOSED tomorrow. No regular work activities will take place. Regular operations resume on Thursday 4th June 2026.

TRADE TEAM: Markets never sleep — please continue monitoring ICE Arabica & Robusta futures, FX, and major price news, and submit your daily market report as usual.

May this day bring you peace and renewed strength. Stay safe and have a meaningful holiday.

— Great Agro Coffee Management
Kasese, Uganda`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')
  if (!lovableApiKey) {
    return new Response(JSON.stringify({ ok: false, error: 'Email service not configured' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const { data: employees, error } = await supabase
    .from('employees')
    .select('name, email, status, disabled')
    .eq('status', 'Active')

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const seen = new Set<string>()
  const recipients = (employees || [])
    .filter((e: any) => e.email && e.disabled !== true)
    .map((e: any) => ({ name: e.name as string, email: (e.email as string).trim() }))
    .filter(r => {
      const k = r.email.toLowerCase()
      if (seen.has(k)) return false
      seen.add(k); return true
    })

  const stamp = Date.now()
  const results: Array<{ email: string; status: string }> = []

  for (const r of recipients) {
    try {
      const idem = `martyrs-day-2026-${stamp}-${r.email.toLowerCase()}`
      await sendLovableEmail(
        { to: r.email, from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`, sender_domain: SENDER_DOMAIN,
          subject: SUBJECT, html: HTML(r.name), text: TEXT(r.name),
          purpose: 'transactional', label: 'martyrs-day-2026-broadcast',
          idempotency_key: idem, unsubscribe_token: token() },
        { apiKey: lovableApiKey, idempotencyKey: idem }
      )
      results.push({ email: r.email, status: 'sent' })
    } catch (err: any) {
      results.push({ email: r.email, status: `failed: ${err.message}` })
    }
  }

  // CC operations
  try {
    const opsIdem = `martyrs-day-2026-ops-${stamp}`
    await sendLovableEmail(
      { to: OPERATIONS_EMAIL, from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`, sender_domain: SENDER_DOMAIN,
        subject: `[CC] ${SUBJECT} — sent to ${results.filter(r=>r.status==='sent').length}/${recipients.length}`,
        html: HTML('Operations Team'), text: TEXT('Operations Team'),
        purpose: 'transactional', label: 'martyrs-day-2026-ops-cc',
        idempotency_key: opsIdem, unsubscribe_token: token() },
      { apiKey: lovableApiKey, idempotencyKey: opsIdem }
    )
  } catch (_) { /* ignore */ }

  const sent = results.filter(r => r.status === 'sent').length
  return new Response(JSON.stringify({ ok: true, total: recipients.length, sent, results }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})