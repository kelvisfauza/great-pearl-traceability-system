import { sendLovableEmail } from 'npm:@lovable.dev/email-js@0.0.4'
import { createClient } from 'npm:@supabase/supabase-js@2.49.1'

const SITE_NAME = 'Great Agro Coffee'
const SENDER_DOMAIN = 'notify.greatpearlcoffeesystem.site'
const FROM_DOMAIN = 'notify.greatpearlcoffeesystem.site'
const OPERATIONS_EMAIL = 'operations@greatpearlcoffee.com'
const LOGO_URL = 'https://great-pearl-traceability-system.lovable.app/lovable-uploads/great-agro-coffee-logo.png'
const APP_URL = 'https://greatpearlcoffeesystem.site/v2/procurement'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function token(): string {
  const b = new Uint8Array(32); crypto.getRandomValues(b)
  return Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('')
}

const esc = (v: any) =>
  String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const HTML = (name: string, dateLabel: string) => `<!doctype html>
<html><body style="margin:0;padding:0;background:#f4f4f5;font-family:'Helvetica Neue',Arial,sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#7c2d12 0%,#b45309 100%);padding:28px;text-align:center;">
          <img src="${LOGO_URL}" alt="Great Agro Coffee" width="56" height="56" style="display:inline-block;border-radius:12px;background:#ffffff;padding:6px;margin-bottom:10px;" />
          <div style="color:#fde68a;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Great Agro Coffee</div>
          <h1 style="color:#ffffff;font-size:20px;margin:8px 0 0;font-weight:700;">DAILY PROCUREMENT REPORT DUE</h1>
        </td></tr>
        <tr><td style="padding:28px;">
          <p style="font-size:15px;margin:0 0 14px;">Dear <strong>${esc(name || 'Colleague')}</strong>,</p>
          <p style="font-size:15px;line-height:1.7;margin:0 0 14px;">
            Your <strong>comprehensive procurement report for ${esc(dateLabel)}</strong> has not yet been filed.
            Filing this report daily is mandatory — it is what Administration reviews to track supplier activity,
            purchases, field observations and issues raised.
          </p>
          <p style="font-size:15px;line-height:1.7;margin:0 0 14px;">
            Please open the Procurement page, complete the <strong>Daily Comprehensive Report</strong> form and submit it.
            It is sent to the admin emails automatically for review.
          </p>
          <div style="text-align:center;margin:24px 0 6px;">
            <a href="${APP_URL}" style="background:#b45309;color:#ffffff;text-decoration:none;padding:12px 26px;border-radius:8px;font-size:14px;font-weight:600;display:inline-block;">File Today's Report</a>
          </div>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:18px 28px;border-top:1px solid #e5e7eb;text-align:center;">
          <div style="font-size:13px;color:#374151;font-weight:600;">Great Agro Coffee &mdash; Member of Hello YEDA COFFEE COMPANY LIMITED</div>
          <div style="font-size:12px;color:#9ca3af;margin-top:4px;">Head Office &middot; P.O Box 431420, Kasese, Uganda &middot; Operations: +256 393 101 103</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const json = (body: unknown) =>
    new Response(JSON.stringify(body), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  try {
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')
    if (!lovableApiKey) return json({ ok: false, error: 'Email service not configured' })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Kampala (UTC+3) working day
    const now = new Date()
    const kampala = new Date(now.getTime() + 3 * 60 * 60 * 1000)
    const today = kampala.toISOString().split('T')[0]
    const dateLabel = kampala.toLocaleDateString('en-GB', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC',
    })

    const { data: filed } = await supabase
      .from('procurement_daily_reports')
      .select('submitted_by_email')
      .eq('report_date', today)

    const filedEmails = new Set(
      (filed || []).map((r: any) => String(r.submitted_by_email || '').toLowerCase()),
    )

    const { data: staff } = await supabase
      .from('employees')
      .select('name,email,department,permissions,disabled,status')
      .not('email', 'is', null)

    const targets = (staff || []).filter((e: any) => {
      if (e.disabled === true) return false
      if (String(e.status || '').toLowerCase() === 'inactive') return false
      const dept = String(e.department || '').toLowerCase()
      const perms = Array.isArray(e.permissions) ? e.permissions.map((p: any) => String(p).toLowerCase()) : []
      const isProcurement = dept.includes('procurement') || perms.some((p: string) => p.includes('procurement'))
      if (!isProcurement) return false
      return !filedEmails.has(String(e.email).trim().toLowerCase())
    })

    if (targets.length === 0) {
      return json({ ok: true, message: 'All procurement reports filed for today', date: today })
    }

    const results: any[] = []
    for (const person of targets) {
      const email = String(person.email).trim().toLowerCase()
      const idem = `proc-report-reminder-${today}-${email}`
      try {
        await sendLovableEmail(
          {
            to: email,
            from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
            sender_domain: SENDER_DOMAIN,
            subject: `Reminder: file your daily procurement report — ${dateLabel}`,
            html: HTML(person.name, dateLabel),
            text: `Dear ${person.name || 'Colleague'}, your comprehensive procurement report for ${dateLabel} has not been filed. Please open ${APP_URL} and submit it. Great Agro Coffee.`,
            purpose: 'transactional',
            label: 'procurement-report-reminder',
            idempotency_key: idem,
            unsubscribe_token: token(),
            cc: [OPERATIONS_EMAIL],
          },
          { apiKey: lovableApiKey, idempotencyKey: idem },
        )
        results.push({ email, status: 'sent' })
      } catch (err: any) {
        console.error(`Reminder failed for ${email}:`, err?.message || err)
        results.push({ email, status: `failed: ${err?.message || 'unknown'}` })
      }
    }

    return json({ ok: true, date: today, reminded: results.length, results })
  } catch (e: any) {
    console.error('procurement-report-reminder error:', e?.message || e)
    return json({ ok: false, error: e?.message || 'Unexpected error' })
  }
})
