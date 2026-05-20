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

const SUBJECT = "Did you know? Your meetings can pay you 💬☕"

const HTML = (name: string) => `<!doctype html>
<html><body style="margin:0;padding:0;background:#f5f1ea;font-family:'Helvetica Neue',Arial,sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f1ea;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(60,40,20,0.08);">
        <tr><td style="background:linear-gradient(135deg,#3d2817 0%,#6b4423 100%);padding:28px 32px;text-align:center;">
          <img src="${LOGO_URL}" alt="Great Agro Coffee" width="64" height="64" style="display:inline-block;border-radius:12px;background:#ffffff;padding:6px;margin-bottom:10px;" />
          <div style="color:#f5e6c8;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Great Agro Coffee</div>
          <h1 style="color:#ffffff;font-size:24px;margin:8px 0 0;font-weight:600;">Your meetings can pay you 💬☕</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="font-size:16px;margin:0 0 14px;">Dear <strong>${name || 'Team'}</strong>,</p>
          <p style="font-size:15px;line-height:1.65;margin:0 0 18px;">
            Did you know you could be earning <strong>up to UGX 5,000 a day</strong> just by
            <strong>starting a departmental meeting</strong> or <strong>hosting a group call</strong> on the system —
            and <strong>up to UGX 3,500</strong> simply for <strong>attending and participating</strong> in one?
          </p>
          <p style="font-size:15px;line-height:1.65;margin:0 0 18px;">
            We rolled out a new <strong>Meeting Rewards</strong> feature that quietly tops up your wallet
            every time you make our conversations matter. No paperwork. No claims. The money just lands.
          </p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:18px 0;">
            <tr><td style="background:#ecfdf5;border-left:4px solid #15803d;padding:16px 18px;border-radius:6px;">
              <div style="font-weight:600;color:#15803d;font-size:15px;margin-bottom:8px;">How to start earning today</div>
              <ol style="font-size:14px;line-height:1.7;color:#374151;padding-left:20px;margin:0;">
                <li>Open the messaging area and tap the <strong>group call / video</strong> icon to host a meeting.</li>
                <li>Give it a clear title (e.g. <em>"Quality Department Standup"</em>) so it counts as a departmental meeting.</li>
                <li>Invite your teammates — the more who join and engage, the better.</li>
                <li>Stay engaged: speak up, react, share screen, or send a quick note in chat.</li>
                <li>End the call normally — your reward lands in your wallet instantly.</li>
              </ol>
            </td></tr>
          </table>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px;">
            <tr><td style="background:#fffbeb;border:1px solid #fcd34d;padding:16px 18px;border-radius:8px;">
              <div style="font-weight:600;color:#92400e;font-size:14px;margin-bottom:6px;">💡 Quick tip</div>
              <div style="font-size:13px;color:#374151;line-height:1.55;">
                Even <strong>chatting actively</strong> on the platform earns you something. The system
                rewards real, useful engagement — so the more you collaborate, the more your wallet grows.
              </div>
            </td></tr>
          </table>
          <table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px auto;">
            <tr><td style="background:#3d2817;border-radius:8px;">
              <a href="${APP_URL}" style="display:inline-block;padding:14px 28px;color:#f5e6c8;font-size:15px;font-weight:600;text-decoration:none;letter-spacing:0.5px;">
                Try it now →
              </a>
            </td></tr>
          </table>
          <p style="font-size:13px;color:#6b7280;line-height:1.6;margin:18px 0 0;text-align:center;">
            Fair-use limits apply per day and per month so everyone gets a fair share. Real participation always wins.
          </p>
        </td></tr>
        <tr><td style="background:#faf6ef;padding:20px 32px;border-top:1px solid #ece4d4;text-align:center;">
          <div style="font-size:13px;color:#6b4423;font-weight:600;">Great Agro Coffee — People &amp; Operations</div>
          <div style="font-size:12px;color:#9ca3af;margin-top:4px;">You're receiving this because you're an active staff member.</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`

const TEXT = (name: string) => `Dear ${name || 'Team'},

Did you know you could be earning up to UGX 5,000 a day just by starting a departmental meeting or hosting a group call on the system — and up to UGX 3,500 simply for attending and participating in one?

We rolled out a new Meeting Rewards feature that quietly tops up your wallet every time you make our conversations matter. No paperwork. No claims. The money just lands.

HOW TO START EARNING TODAY
1. Open the messaging area and tap the group call / video icon to host a meeting.
2. Give it a clear title (e.g. "Quality Department Standup") so it counts as a departmental meeting.
3. Invite your teammates — the more who join and engage, the better.
4. Stay engaged: speak up, react, share screen, or send a quick note in chat.
5. End the call normally — your reward lands in your wallet instantly.

Tip: Even chatting actively on the platform earns you something. Real engagement always wins.

Try it now: ${APP_URL}

Fair-use limits apply per day and per month so everyone gets a fair share.

— Great Agro Coffee, People & Operations`

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
      const idem = `meeting-rewards-teaser-v1-${stamp}-${r.email.toLowerCase()}`
      await sendLovableEmail(
        { to: r.email, from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`, sender_domain: SENDER_DOMAIN,
          subject: SUBJECT, html: HTML(r.name), text: TEXT(r.name),
          purpose: 'transactional', label: 'meeting-rewards-teaser',
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