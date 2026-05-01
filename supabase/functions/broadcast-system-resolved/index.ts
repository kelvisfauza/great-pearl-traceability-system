import { sendLovableEmail } from 'npm:@lovable.dev/email-js@0.0.4'
import { createClient } from 'npm:@supabase/supabase-js@2.49.1'

const SITE_NAME = "Great Pearl Coffee"
const SENDER_DOMAIN = "notify.greatpearlcoffeesystem.site"
const FROM_DOMAIN = "greatpearlcoffeesystem.site"
const OPERATIONS_EMAIL = 'operations@greatpearlcoffee.com'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function token(): string {
  const b = new Uint8Array(32); crypto.getRandomValues(b)
  return Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('')
}

const SUBJECT = "System Issue Resolved — Great Pearl Coffee"

const HTML = (name: string) => `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#ffffff;color:#1f2937;padding:24px;max-width:640px;margin:0 auto;">
  <h2 style="color:#15803d;margin:0 0 16px;">System Issue Resolved ✅</h2>
  <p>Dear ${name || 'Team'},</p>
  <p>The system access issue some of you experienced earlier today has been <strong>fully resolved</strong>. You should now be able to log in and access your dashboards, roles, and permissions normally.</p>
  <p><strong>If you still see any problem:</strong></p>
  <ol>
    <li>Refresh your browser (Ctrl + F5 / Cmd + Shift + R)</li>
    <li>Log out and log back in</li>
  </ol>
  <p>We apologise for the inconvenience caused and thank you for your patience.</p>
  <p style="color:#6b7280;margin-top:24px;">— Great Pearl Coffee IT</p>
</body></html>`

const TEXT = (name: string) => `Dear ${name || 'Team'},

The system access issue some of you experienced earlier today has been fully resolved. You should now be able to log in and access your dashboards, roles and permissions normally.

If you still see any problem:
1. Refresh your browser (Ctrl + F5 / Cmd + Shift + R)
2. Log out and log back in

We apologise for the inconvenience caused and thank you for your patience.

— Great Pearl Coffee IT`

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