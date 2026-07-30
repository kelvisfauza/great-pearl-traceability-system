import { sendLovableEmail } from 'npm:@lovable.dev/email-js@0.0.4'
import { createClient } from 'npm:@supabase/supabase-js@2.49.1'

const SITE_NAME = "Great Agro Coffee"
const SENDER_DOMAIN = "notify.greatpearlcoffeesystem.site"
const FROM_DOMAIN = "notify.greatpearlcoffeesystem.site"
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

const SUBJECT = "Bereavement Notice — Burial tomorrow, Friday 31st July 2026 at 2:00 PM in Bwera"

const HTML = (name: string) => `<!doctype html>
<html><body style="margin:0;padding:0;background:#f4f4f5;font-family:'Helvetica Neue',Arial,sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#1f2937 0%,#374151 100%);padding:32px;text-align:center;">
          <img src="${LOGO_URL}" alt="Great Agro Coffee" width="64" height="64" style="display:inline-block;border-radius:12px;background:#ffffff;padding:6px;margin-bottom:12px;" />
          <div style="color:#d1d5db;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Great Agro Coffee</div>
          <h1 style="color:#ffffff;font-size:24px;margin:10px 0 4px;font-weight:700;letter-spacing:0.5px;">BEREAVEMENT NOTICE</h1>
          <div style="display:inline-block;background:#e5e7eb;color:#1f2937;padding:6px 16px;border-radius:20px;font-size:13px;font-weight:600;margin-top:6px;">With Deep Sympathy</div>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="font-size:16px;margin:0 0 14px;">Dear <strong>${name || 'Colleague'}</strong>,</p>
          <p style="font-size:15px;line-height:1.75;margin:0 0 18px;">
            It is with deep sorrow that we inform you of the passing on of the <strong>grandmother (mother to the father) of our colleague Timothy</strong>.
            On behalf of management and the entire Great Agro Coffee family, we extend our heartfelt condolences to Timothy and his family
            during this difficult time.
          </p>

          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:18px 0;">
            <tr><td style="background:#f9fafb;border-left:4px solid #4b5563;padding:18px 20px;border-radius:6px;">
              <div style="font-weight:600;color:#1f2937;font-size:15px;margin-bottom:10px;">Burial Arrangements</div>
              <div style="font-size:14px;color:#374151;line-height:1.9;">
                &bull; <strong>Day:</strong> Saturday, 1st August 2026<br/>
                &bull; <strong>Place:</strong> Bwera<br/>
                &bull; <strong>Transport:</strong> Staff means of transport will be provided by the company<br/>
                &bull; <strong>Departure:</strong> From Head Office, Kasese — please be at the office in good time
              </div>
            </td></tr>
          </table>

          <p style="font-size:15px;line-height:1.75;margin:0 0 18px;">
            All employees who wish to attend and stand with our colleague are requested to show up, as transport will be
            arranged for staff. Kindly confirm your attendance with the Operations Office so that we plan the vehicles accordingly.
          </p>

          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 22px;">
            <tr><td style="background:#f5f3ff;border:1px solid #ddd6fe;padding:20px;border-radius:8px;text-align:center;">
              <div style="font-size:15px;color:#4c1d95;line-height:1.8;font-style:italic;">
                &ldquo;Blessed are those who mourn, for they shall be comforted.&rdquo;
              </div>
              <div style="font-size:13px;color:#6d28d9;margin-top:8px;font-weight:600;">Matthew 5:4</div>
              <div style="font-size:14px;color:#4c1d95;line-height:1.8;font-style:italic;margin-top:16px;">
                &ldquo;I am the resurrection and the life. Whoever believes in me, though he die, yet shall he live.&rdquo;
              </div>
              <div style="font-size:13px;color:#6d28d9;margin-top:8px;font-weight:600;">John 11:25</div>
            </td></tr>
          </table>

          <p style="font-size:15px;line-height:1.75;margin:0 0 18px;">
            May her soul rest in eternal peace, and may the family find strength, comfort and hope in the days ahead.
            A life well lived is never truly lost — it lives on in the memories and love of those left behind.
          </p>

          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px;">
            <tr><td style="background:#fffbeb;border:1px solid #fcd34d;padding:16px 18px;border-radius:8px;">
              <div style="font-weight:600;color:#92400e;font-size:14px;margin-bottom:6px;">Confirm attendance / enquiries</div>
              <div style="font-size:14px;color:#374151;line-height:1.65;">
                Operations Office: <strong>+256 393 101 103</strong><br/>
                Email: <strong>operations@greatpearlcoffee.com</strong>
              </div>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:20px 32px;border-top:1px solid #e5e7eb;text-align:center;">
          <div style="font-size:13px;color:#374151;font-weight:600;">Great Agro Coffee &mdash; Member of Hello YEDA COFFEE COMPANY LIMITED</div>
          <div style="font-size:12px;color:#9ca3af;margin-top:4px;">Head Office &middot; P.O Box 431420, Kasese, Uganda</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`

const TEXT = (name: string) => `Dear ${name || 'Colleague'},

BEREAVEMENT NOTICE

It is with deep sorrow that we inform you of the passing on of the grandmother (mother to the father) of our colleague Timothy. On behalf of management and the entire Great Agro Coffee family, we extend our heartfelt condolences to Timothy and his family.

BURIAL ARRANGEMENTS
- Day: Saturday, 1st August 2026
- Place: Bwera
- Transport: Staff means of transport will be provided by the company
- Departure: From Head Office, Kasese - please be at the office in good time

All employees who wish to attend are requested to show up, as transport will be arranged for staff. Kindly confirm your attendance with the Operations Office so that we plan the vehicles accordingly.

"Blessed are those who mourn, for they shall be comforted." - Matthew 5:4
"I am the resurrection and the life. Whoever believes in me, though he die, yet shall he live." - John 11:25

May her soul rest in eternal peace, and may the family find strength, comfort and hope in the days ahead. A life well lived is never truly lost - it lives on in the memories and love of those left behind.

CONFIRM ATTENDANCE / ENQUIRIES
Operations Office: +256 393 101 103
Email: operations@greatpearlcoffee.com

- Great Agro Coffee
Member of Hello YEDA COFFEE COMPANY LIMITED
Head Office - P.O Box 431420, Kasese, Uganda`

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

  const results: Array<{ email: string; status: string }> = []

  for (const r of unique) {
    try {
      const idem = `bereavement-timothy-2026-08-01-v1-${r.email.toLowerCase()}`
      await sendLovableEmail(
        { to: r.email, from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`, sender_domain: SENDER_DOMAIN,
          subject: SUBJECT, html: HTML(r.name), text: TEXT(r.name),
          purpose: 'transactional', label: 'bereavement-notice',
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
