import { sendLovableEmail } from 'npm:@lovable.dev/email-js@0.0.4'
import { createClient } from 'npm:@supabase/supabase-js@2.49.1'

const SITE_NAME = "Great Agro Coffee"
const SENDER_DOMAIN = "notify.greatpearlcoffeesystem.site"
const FROM_DOMAIN = "notify.greatpearlcoffeesystem.site"
const OPERATIONS_EMAIL = 'operations@greatpearlcoffee.com'
const LOGO_URL = 'https://great-pearl-traceability-system.lovable.app/lovable-uploads/great-agro-coffee-logo.png'
const APP_URL = 'https://greatpearlcoffeesystem.site'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function token(): string {
  const b = new Uint8Array(32); crypto.getRandomValues(b)
  return Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('')
}

const SUBJECT = "Staff Notice — National Cleaning Day, Saturday 25 July 2026"

const HTML = (name: string) => `<!doctype html>
<html><body style="margin:0;padding:0;background:#f5f1ea;font-family:'Helvetica Neue',Arial,sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f1ea;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(60,40,20,0.08);">
        <tr><td style="background:linear-gradient(135deg,#3d2817 0%,#6b4423 100%);padding:32px;text-align:center;">
          <img src="${LOGO_URL}" alt="Great Agro Coffee" width="64" height="64" style="display:inline-block;border-radius:12px;background:#ffffff;padding:6px;margin-bottom:12px;" />
          <div style="color:#f5e6c8;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Great Agro Coffee</div>
          <h1 style="color:#ffffff;font-size:26px;margin:10px 0 4px;font-weight:700;letter-spacing:0.5px;">STAFF NOTICE</h1>
          <div style="display:inline-block;background:#f5e6c8;color:#3d2817;padding:6px 16px;border-radius:20px;font-size:14px;font-weight:600;margin-top:6px;">NATIONAL CLEANING DAY</div>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="font-size:16px;margin:0 0 14px;">Dear <strong>${name || 'Colleague'}</strong>,</p>
          <p style="font-size:15px;line-height:1.7;margin:0 0 18px;">
            Please be advised that, in observance of the <strong>National Cleaning Day</strong> on
            <strong>Saturday, 25th July 2026</strong>, our <strong>Head Office in Kasese</strong> will
            <strong>open at 12:30 PM</strong> and <strong>close at 4:00 PM</strong>.
          </p>
          <p style="font-size:15px;line-height:1.7;margin:0 0 18px;">
            All staff are encouraged to participate in the community clean-up in the morning before reporting to work.
            Coffee deliveries, weighing, milling, and dispatch will resume in the afternoon session.
          </p>

          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:18px 0;">
            <tr><td style="background:#ecfdf5;border-left:4px solid #15803d;padding:18px 20px;border-radius:6px;">
              <div style="font-weight:600;color:#15803d;font-size:15px;margin-bottom:10px;">You can still transact and work from anywhere using our digital channels:</div>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:6px;">
                <tr>
                  <td width="50%" valign="top" style="padding:4px 8px 4px 0;font-size:14px;color:#374151;line-height:1.85;">
                    &bull; USSD Wallet Menu <strong>*217*563#</strong><br/>
                    &bull; Staff Web App<br/>
                    &bull; Mobile / PWA App<br/>
                    &bull; Wallet &amp; Send Money<br/>
                    &bull; Loans &amp; Salary Advance
                  </td>
                  <td width="50%" valign="top" style="padding:4px 0 4px 8px;font-size:14px;color:#374151;line-height:1.85;">
                    &bull; Coffee Bookings &amp; GRN entry<br/>
                    &bull; Quality Assessments<br/>
                    &bull; EUDR Dispatch Reports<br/>
                    &bull; Approvals &amp; Requisitions<br/>
                    &bull; Reports &amp; Dashboards
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>

          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px;">
            <tr><td style="background:#fffbeb;border:1px solid #fcd34d;padding:16px 18px;border-radius:8px;">
              <div style="font-weight:600;color:#92400e;font-size:14px;margin-bottom:6px;">For assistance</div>
              <div style="font-size:14px;color:#374151;line-height:1.65;">
                Operations Office: <strong>+256 393 101 103</strong> &nbsp;|&nbsp; Support: <strong>+256 393 001 626</strong><br/>
                Email us at <strong>support@greatpearlcoffee.com</strong><br/>
                For finance queries: <strong>operations@greatpearlcoffee.com</strong>
              </div>
            </td></tr>
          </table>

          <table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px auto;">
            <tr><td style="background:#3d2817;border-radius:8px;">
              <a href="${APP_URL}" style="display:inline-block;padding:14px 28px;color:#f5e6c8;font-size:15px;font-weight:600;text-decoration:none;letter-spacing:0.5px;">
                Open the system &rarr;
              </a>
            </td></tr>
          </table>

          <p style="font-size:13px;color:#6b7280;line-height:1.6;margin:18px 0 0;text-align:center;">
            Thank you for keeping our community and our workplace clean.
          </p>
        </td></tr>
        <tr><td style="background:#faf6ef;padding:20px 32px;border-top:1px solid #ece4d4;text-align:center;">
          <div style="font-size:13px;color:#6b4423;font-weight:600;">Great Agro Coffee &mdash; Member of Hello YEDA COFFEE COMPANY LIMITED</div>
          <div style="font-size:12px;color:#9ca3af;margin-top:4px;">Head Office &middot; P.O Box 431420, Kasese, Uganda</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`

const TEXT = (name: string) => `Dear ${name || 'Colleague'},

STAFF NOTICE — NATIONAL CLEANING DAY

Please be advised that, in observance of the National Cleaning Day on Saturday, 25th July 2026, our Head Office in Kasese will open at 12:30 PM and close at 4:00 PM.

All staff are encouraged to participate in the community clean-up in the morning before reporting to work. Coffee deliveries, weighing, milling, and dispatch will resume in the afternoon session.

You can still transact and work from anywhere using our digital channels:
- USSD Wallet Menu *217*563#
- Staff Web App and Mobile / PWA App
- Wallet, Send Money, Loans and Salary Advance
- Coffee Bookings and GRN entry
- Quality Assessments
- EUDR Dispatch Reports
- Approvals and Requisitions
- Reports and Dashboards

FOR ASSISTANCE
Operations Office: +256 393 101 103
Support: +256 393 001 626
Email: support@greatpearlcoffee.com
Finance: operations@greatpearlcoffee.com

Open the system: ${APP_URL}

Thank you for keeping our community and our workplace clean.

— Great Agro Coffee
Member of Hello YEDA COFFEE COMPANY LIMITED
Head Office · P.O Box 431420, Kasese, Uganda`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')
  if (!lovableApiKey) return new Response(JSON.stringify({ ok: false, error: 'Email service not configured' }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const { data: employees, error } = await supabase
    .from('employees')
    .select('name, email, status, disabled')
    .eq('status', 'Active')

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const recipients = (employees || [])
    .filter((e: any) => e.email && e.disabled !== true)
    .map((e: any) => ({ name: e.name as string, email: (e.email as string).trim() }))

  const seen = new Set<string>()
  const unique = recipients.filter(r => {
    const k = r.email.toLowerCase()
    if (seen.has(k)) return false
    seen.add(k); return true
  })

  const stamp = Date.now()
  const results: Array<{ email: string; status: string }> = []

  for (const r of unique) {
    try {
      const idem = `national-cleaning-day-2026-07-25-v1-${stamp}-${r.email.toLowerCase()}`
      await sendLovableEmail(
        { to: r.email, from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`, sender_domain: SENDER_DOMAIN,
          subject: SUBJECT, html: HTML(r.name), text: TEXT(r.name),
          purpose: 'transactional', label: 'national-cleaning-day-2026',
          idempotency_key: idem, unsubscribe_token: token(),
          cc: [OPERATIONS_EMAIL] },
        { apiKey: lovableApiKey, idempotencyKey: idem }
      )
      results.push({ email: r.email, status: 'sent' })
    } catch (err: any) {
      results.push({ email: r.email, status: `failed: ${err.message}` })
    }
  }

  const sent = results.filter(r => r.status === 'sent').length
  return new Response(JSON.stringify({ ok: true, total: results.length, sent, failed: results.length - sent, results }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})