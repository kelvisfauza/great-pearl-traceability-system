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

const SUBJECT = "Loyalty Boost — Effective 1 August 2026"

const HTML = (name: string) => `<!doctype html>
<html><body style="margin:0;padding:0;background:#f5f1ea;font-family:'Helvetica Neue',Arial,sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f1ea;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(60,40,20,0.08);">
        <tr><td style="background:linear-gradient(135deg,#3d2817 0%,#6b4423 100%);padding:28px 32px;text-align:center;">
          <img src="${LOGO_URL}" alt="Great Agro Coffee" width="64" height="64" style="display:inline-block;border-radius:12px;background:#ffffff;padding:6px;margin-bottom:10px;" />
          <div style="color:#f5e6c8;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Great Agro Coffee</div>
          <h1 style="color:#ffffff;font-size:24px;margin:8px 0 0;font-weight:600;">Your Loyalty, Now Worth 3× More</h1>
          <div style="color:#f5e6c8;font-size:13px;margin-top:6px;">Effective 1 August 2026</div>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="font-size:16px;margin:0 0 14px;">Dear <strong>${name || 'Team'}</strong>,</p>
          <p style="font-size:15px;line-height:1.65;margin:0 0 18px;">
            We're pleased to announce a major upgrade to the <strong>Staff Loyalty Programme</strong>.
            Starting <strong>Friday, 1 August 2026</strong>, the way your everyday work on the system
            translates into wallet rewards is getting significantly better.
          </p>

          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:18px 0;">
            <tr><td style="background:#ecfdf5;border-left:4px solid #15803d;padding:18px 20px;border-radius:6px;">
              <div style="font-weight:600;color:#15803d;font-size:15px;margin-bottom:10px;">What's changing</div>
              <ul style="font-size:14px;line-height:1.75;color:#374151;padding-left:20px;margin:0;">
                <li><strong>Loyalty bonus per activity: increased 3×</strong> — every approval, form, task, transaction, report and interaction you complete will earn you three times what it earns today.</li>
                <li><strong>Monthly loyalty cap: raised to UGX 120,000</strong> (up from UGX 50,000) — so your wallet can now grow up to <strong>UGX 120,000 every month</strong> purely from loyalty.</li>
              </ul>
            </td></tr>
          </table>

          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px;">
            <tr><td style="background:#fffbeb;border:1px solid #fcd34d;padding:16px 18px;border-radius:8px;">
              <div style="font-weight:600;color:#92400e;font-size:14px;margin-bottom:6px;">What this means for you</div>
              <div style="font-size:14px;color:#374151;line-height:1.6;">
                The more actively you use the system — approving requests, submitting reports, filing forms,
                completing tasks, participating in chats and meetings — the faster your loyalty wallet grows.
                Balances build up and can be withdrawn, invested in the <strong>Invest &amp; Earn</strong> programme,
                or used to offset expense claims, just as today.
              </div>
            </td></tr>
          </table>

          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px;">
            <tr><td style="background:#f3f4f6;border:1px solid #e5e7eb;padding:16px 18px;border-radius:8px;">
              <div style="font-weight:600;color:#374151;font-size:14px;margin-bottom:6px;">A few notes</div>
              <ul style="font-size:13px;color:#4b5563;line-height:1.6;padding-left:18px;margin:0;">
                <li>Change applies automatically on <strong>1 August 2026</strong> — no action needed.</li>
                <li>July 2026 loyalty earnings remain under the current UGX 50,000 cap. No retroactive top-ups.</li>
                <li>Existing fair-use limits (daily action limits, anti-farming rules) stay in place.</li>
              </ul>
            </td></tr>
          </table>

          <table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px auto;">
            <tr><td style="background:#3d2817;border-radius:8px;">
              <a href="${APP_URL}" style="display:inline-block;padding:14px 28px;color:#f5e6c8;font-size:15px;font-weight:600;text-decoration:none;letter-spacing:0.5px;">
                Open the system →
              </a>
            </td></tr>
          </table>

          <p style="font-size:13px;color:#6b7280;line-height:1.6;margin:18px 0 0;text-align:center;">
            Thank you for the work you do every day. Keep engaging — your wallet will thank you.
          </p>
        </td></tr>
        <tr><td style="background:#faf6ef;padding:20px 32px;border-top:1px solid #ece4d4;text-align:center;">
          <div style="font-size:13px;color:#6b4423;font-weight:600;">Great Agro Coffee — Member of Hello YEDA COFFEE COMPANY LIMITED</div>
          <div style="font-size:12px;color:#9ca3af;margin-top:4px;">P.O Box 431420, Kasese, Uganda</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`

const TEXT = (name: string) => `Dear ${name || 'Team'},

We're pleased to announce a major upgrade to the Staff Loyalty Programme, effective Friday, 1 August 2026.

WHAT'S CHANGING
- Loyalty bonus per activity: increased 3x. Every approval, form, task, transaction, report and interaction will earn you three times what it earns today.
- Monthly loyalty cap: raised to UGX 120,000 (up from UGX 50,000). Your wallet can now grow up to UGX 120,000 every month purely from loyalty.

WHAT THIS MEANS FOR YOU
The more actively you use the system, the faster your loyalty wallet grows. Balances can be withdrawn, invested in Invest & Earn, or used to offset expense claims — just as today.

NOTES
- Change applies automatically on 1 August 2026. No action needed.
- July 2026 earnings remain under the current UGX 50,000 cap. No retroactive top-ups.
- Existing fair-use limits (daily action limits, anti-farming rules) stay in place.

Open the system: ${APP_URL}

Thank you for the work you do every day.

— Great Agro Coffee
Member of Hello YEDA COFFEE COMPANY LIMITED
P.O Box 431420, Kasese, Uganda`

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
      const idem = `loyalty-boost-aug1-v1-${stamp}-${r.email.toLowerCase()}`
      await sendLovableEmail(
        { to: r.email, from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`, sender_domain: SENDER_DOMAIN,
          subject: SUBJECT, html: HTML(r.name), text: TEXT(r.name),
          purpose: 'transactional', label: 'loyalty-boost-aug1',
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