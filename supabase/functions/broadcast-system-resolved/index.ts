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

const SUBJECT = "✅ System Fully Restored — Withdrawals Re-enabled"

const HTML = (name: string) => `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#f5f1ea;font-family:'Helvetica Neue',Arial,sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f1ea;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(60,40,20,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#3d2817 0%,#6b4423 100%);padding:28px 32px;text-align:center;">
            <img src="${LOGO_URL}" alt="Great Agro Coffee" width="64" height="64" style="display:inline-block;border-radius:12px;background:#ffffff;padding:6px;margin-bottom:10px;" />
            <div style="color:#f5e6c8;font-size:14px;letter-spacing:2px;text-transform:uppercase;">Great Agro Coffee</div>
            <h1 style="color:#ffffff;font-size:24px;margin:8px 0 0;font-weight:600;">System Fully Restored ✅</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="font-size:16px;margin:0 0 16px;">Dear <strong>${name || 'Team'}</strong>,</p>
            <p style="font-size:15px;line-height:1.65;margin:0 0 18px;">
              We are pleased to inform you that the system access issue some of you experienced earlier today has been
              <strong style="color:#15803d;">fully resolved</strong>. All dashboards, roles, permissions and modules are now operating normally.
            </p>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;">
              <tr>
                <td style="background:#ecfdf5;border-left:4px solid #15803d;padding:16px 18px;border-radius:6px;">
                  <div style="font-weight:600;color:#15803d;font-size:15px;margin-bottom:6px;">💸 Withdrawals Re-enabled</div>
                  <div style="font-size:14px;color:#374151;line-height:1.55;">
                    You can now withdraw funds from your wallet normally. All wallet balances have been audited and confirmed accurate.
                  </div>
                </td>
              </tr>
            </table>
            <p style="font-size:15px;margin:18px 0 8px;"><strong>If you still notice anything unusual:</strong></p>
            <ol style="font-size:14px;line-height:1.7;color:#374151;padding-left:20px;margin:0 0 18px;">
              <li>Refresh your browser using <strong>Ctrl + F5</strong> (Windows) or <strong>Cmd + Shift + R</strong> (Mac)</li>
              <li>Log out and log back in to refresh your session</li>
              <li>If the problem persists, contact IT or Operations</li>
            </ol>
            <p style="font-size:14px;line-height:1.6;color:#4b5563;margin:20px 0 0;">
              We sincerely apologise for the inconvenience caused this morning and thank you for your patience and understanding while we worked to resolve it.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#faf6ef;padding:20px 32px;border-top:1px solid #ece4d4;text-align:center;">
            <div style="font-size:13px;color:#6b4423;font-weight:600;">Great Agro Coffee — IT & Operations</div>
            <div style="font-size:12px;color:#9ca3af;margin-top:4px;">This is an automated system notification.</div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

const TEXT = (name: string) => `Dear ${name || 'Team'},

SYSTEM FULLY RESTORED ✅

We are pleased to inform you that the system access issue some of you experienced earlier today has been fully resolved. All dashboards, roles, permissions and modules are now operating normally.

💸 WITHDRAWALS RE-ENABLED
You can now withdraw funds from your wallet normally. All wallet balances have been audited and confirmed accurate.

If you still notice anything unusual:
1. Refresh your browser (Ctrl + F5 / Cmd + Shift + R)
2. Log out and log back in
3. If the problem persists, contact IT or Operations

We sincerely apologise for the inconvenience caused this morning and thank you for your patience.

— Great Agro Coffee, IT & Operations`

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

  // De-dupe by email
  const seen = new Set<string>()
  const unique = recipients.filter(r => {
    const k = r.email.toLowerCase()
    if (seen.has(k)) return false
    seen.add(k); return true
  })

  const today = new Date().toISOString().split('T')[0]
  const results: Array<{email: string; status: string}> = []

  for (const r of unique) {
    try {
      const idem = `system-resolved-${today}-${r.email.toLowerCase()}`
      await sendLovableEmail(
        { to: r.email, from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`, sender_domain: SENDER_DOMAIN,
          subject: SUBJECT, html: HTML(r.name), text: TEXT(r.name),
          purpose: 'transactional', label: 'system-resolved-broadcast',
          idempotency_key: idem, unsubscribe_token: token() },
        { apiKey: lovableApiKey, idempotencyKey: idem }
      )
      results.push({ email: r.email, status: 'sent' })
    } catch (err: any) {
      results.push({ email: r.email, status: `failed: ${err.message}` })
    }
  }

  // CC operations once
  try {
    const idem = `system-resolved-${today}-ops-cc`
    await sendLovableEmail(
      { to: OPERATIONS_EMAIL, from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`, sender_domain: SENDER_DOMAIN,
        subject: `[CC] ${SUBJECT}`, html: HTML('Operations'), text: `[CC - Broadcast]\n\n${TEXT('Operations')}`,
        purpose: 'transactional', label: 'system-resolved-broadcast-cc',
        idempotency_key: idem, unsubscribe_token: token() },
      { apiKey: lovableApiKey, idempotencyKey: idem }
    )
  } catch (_) { /* ignore */ }

  const sent = results.filter(r => r.status === 'sent').length
  const failed = results.length - sent
  return new Response(JSON.stringify({ ok: true, total: results.length, sent, failed, results }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})