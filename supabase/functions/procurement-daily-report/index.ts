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

const block = (label: string, value: any) => {
  const text = String(value ?? '').trim()
  if (!text) return ''
  return `
    <tr>
      <td style="padding:12px 14px;border-bottom:1px solid #e5e7eb;vertical-align:top;width:200px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">${esc(label)}</td>
      <td style="padding:12px 14px;border-bottom:1px solid #e5e7eb;font-size:14px;line-height:1.6;color:#111827;white-space:pre-wrap;">${esc(text)}</td>
    </tr>`
}

const HTML = (r: any) => `<!doctype html>
<html><body style="margin:0;padding:0;background:#f4f4f5;font-family:'Helvetica Neue',Arial,sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="720" cellspacing="0" cellpadding="0" style="max-width:720px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#14532d 0%,#166534 100%);padding:28px;text-align:center;">
          <img src="${LOGO_URL}" alt="Great Agro Coffee" width="56" height="56" style="display:inline-block;border-radius:12px;background:#ffffff;padding:6px;margin-bottom:10px;" />
          <div style="color:#bbf7d0;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Great Agro Coffee</div>
          <h1 style="color:#ffffff;font-size:21px;margin:8px 0 0;font-weight:700;">DAILY PROCUREMENT REPORT</h1>
          <div style="color:#dcfce7;font-size:13px;margin-top:6px;">${esc(new Date(r.report_date).toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }))}</div>
        </td></tr>
        <tr><td style="padding:28px;">
          <p style="font-size:15px;margin:0 0 16px;">
            Filed by <strong>${esc(r.submitted_by_name || r.submitted_by_email)}</strong> for review.
          </p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:18px;">
            <tr style="background:#f9fafb;">
              <td style="padding:12px 14px;font-size:12px;color:#6b7280;">SUPPLIERS VISITED</td>
              <td style="padding:12px 14px;font-size:12px;color:#6b7280;">KILOGRAMS PURCHASED</td>
              <td style="padding:12px 14px;font-size:12px;color:#6b7280;">AVERAGE PRICE</td>
            </tr>
            <tr>
              <td style="padding:12px 14px;font-size:18px;font-weight:700;">${Number(r.suppliers_visited || 0).toLocaleString()}</td>
              <td style="padding:12px 14px;font-size:18px;font-weight:700;">${Number(r.kilograms_purchased || 0).toLocaleString()} kg</td>
              <td style="padding:12px 14px;font-size:18px;font-weight:700;">UGX ${Number(r.average_price || 0).toLocaleString()}</td>
            </tr>
          </table>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
            ${block('Observations', r.observations)}
            ${block('Issues / Challenges', r.issues)}
            ${block('Actions taken', r.actions_taken)}
            ${block('Deliveries expected', r.deliveries_expected)}
            ${block('Market notes', r.market_notes)}
            ${block('Plan for tomorrow', r.plan_next_day)}
          </table>
          <div style="text-align:center;margin:24px 0 6px;">
            <a href="${APP_URL}" style="background:#166534;color:#ffffff;text-decoration:none;padding:12px 26px;border-radius:8px;font-size:14px;font-weight:600;display:inline-block;">Open Procurement</a>
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

const TEXT = (r: any) => [
  `DAILY PROCUREMENT REPORT — ${r.report_date}`,
  `Filed by: ${r.submitted_by_name || r.submitted_by_email}`,
  `Suppliers visited: ${r.suppliers_visited}`,
  `Kilograms purchased: ${r.kilograms_purchased}`,
  `Average price: UGX ${r.average_price}`,
  ``,
  `Observations: ${r.observations || '-'}`,
  `Issues: ${r.issues || '-'}`,
  `Actions taken: ${r.actions_taken || '-'}`,
  `Deliveries expected: ${r.deliveries_expected || '-'}`,
  `Market notes: ${r.market_notes || '-'}`,
  `Plan for tomorrow: ${r.plan_next_day || '-'}`,
  ``,
  `Great Agro Coffee — Member of Hello YEDA COFFEE COMPANY LIMITED`,
].join('\n')

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  try {
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')
    if (!lovableApiKey) return json({ ok: false, error: 'Email service not configured' })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const body = await req.json().catch(() => ({}))
    const reportId = String(body?.reportId || '').trim()
    if (!reportId) return json({ ok: false, error: 'reportId is required' })

    const { data: report, error } = await supabase
      .from('procurement_daily_reports')
      .select('*')
      .eq('id', reportId)
      .maybeSingle()

    if (error) return json({ ok: false, error: error.message })
    if (!report) return json({ ok: false, error: 'Report not found' })

    // Recipients: administrators (never disabled accounts)
    const { data: admins } = await supabase
      .from('employees')
      .select('name,email,role,department,disabled')
      .not('email', 'is', null)

    const recipients = (admins || []).filter((e: any) => {
      if (e.disabled === true) return false
      const role = String(e.role || '').toLowerCase()
      const dept = String(e.department || '').toLowerCase()
      return role.includes('admin') || dept === 'administration'
    })

    const emails = Array.from(
      new Set(recipients.map((e: any) => String(e.email).trim().toLowerCase()).filter(Boolean)),
    )

    if (emails.length === 0) return json({ ok: false, error: 'No admin recipients found' })

    const results: any[] = []
    for (const email of emails) {
      const idem = `proc-daily-report-${report.id}-${email}`
      try {
        await sendLovableEmail(
          {
            to: email,
            from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
            sender_domain: SENDER_DOMAIN,
            subject: `Daily Procurement Report — ${new Date(report.report_date).toLocaleDateString('en-GB')} (${report.submitted_by_name || report.submitted_by_email})`,
            html: HTML(report),
            text: TEXT(report),
            purpose: 'transactional',
            label: 'procurement-daily-report',
            idempotency_key: idem,
            unsubscribe_token: token(),
            cc: [OPERATIONS_EMAIL],
          },
          { apiKey: lovableApiKey, idempotencyKey: idem },
        )
        results.push({ email, status: 'sent' })
      } catch (err: any) {
        console.error(`Failed to email ${email}:`, err?.message || err)
        results.push({ email, status: `failed: ${err?.message || 'unknown'}` })
      }
    }

    const anySent = results.some(r => r.status === 'sent')
    if (anySent) {
      await supabase
        .from('procurement_daily_reports')
        .update({ emailed_at: new Date().toISOString() })
        .eq('id', report.id)
    }

    return json({ ok: anySent, sent: results.filter(r => r.status === 'sent').length, results })
  } catch (e: any) {
    console.error('procurement-daily-report error:', e?.message || e)
    return json({ ok: false, error: e?.message || 'Unexpected error' })
  }
})
