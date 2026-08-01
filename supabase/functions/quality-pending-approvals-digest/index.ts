import { sendLovableEmail } from 'npm:@lovable.dev/email-js@0.0.4'
import { createClient } from 'npm:@supabase/supabase-js@2.49.1'

const SITE_NAME = 'Great Agro Coffee'
const SENDER_DOMAIN = 'notify.greatpearlcoffeesystem.site'
const FROM_DOMAIN = 'notify.greatpearlcoffeesystem.site'
const OPERATIONS_EMAIL = 'operations@greatpearlcoffee.com'
const LOGO_URL = 'https://great-pearl-traceability-system.lovable.app/lovable-uploads/great-agro-coffee-logo.png'
const APP_URL = 'https://greatpearlcoffeesystem.site/v2/quality'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function token(): string {
  const b = new Uint8Array(32); crypto.getRandomValues(b)
  return Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('')
}

const money = (v: any) => `UGX ${Number(v || 0).toLocaleString()}`
const day = (v: any) => (v ? new Date(v).toLocaleDateString('en-GB') : '—')

const rows = (list: any[]) => list.map((a: any) => `
  <tr>
    <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-size:13px;">${a.batch_number || '—'}</td>
    <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-size:13px;">${a.supplier_name || '—'}</td>
    <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-size:13px;">${a.moisture ?? '—'}%</td>
    <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-size:13px;">${money(a.suggested_price)}</td>
    <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-size:13px;">${a.assessed_by || '—'}</td>
    <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-size:13px;">${day(a.created_at)}</td>
  </tr>`).join('')

const HTML = (name: string, list: any[], oldest: number) => `<!doctype html>
<html><body style="margin:0;padding:0;background:#f4f4f5;font-family:'Helvetica Neue',Arial,sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="720" cellspacing="0" cellpadding="0" style="max-width:720px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#7c2d12 0%,#b45309 100%);padding:28px;text-align:center;">
          <img src="${LOGO_URL}" alt="Great Agro Coffee" width="56" height="56" style="display:inline-block;border-radius:12px;background:#ffffff;padding:6px;margin-bottom:10px;" />
          <div style="color:#fde68a;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Great Agro Coffee</div>
          <h1 style="color:#ffffff;font-size:21px;margin:8px 0 0;font-weight:700;">QUALITY APPROVALS PENDING</h1>
        </td></tr>
        <tr><td style="padding:28px;">
          <p style="font-size:15px;margin:0 0 14px;">Dear <strong>${name || 'Head of Quality'}</strong>,</p>
          <p style="font-size:15px;line-height:1.7;margin:0 0 16px;">
            You have <strong>${list.length}</strong> quality assessment${list.length === 1 ? '' : 's'} awaiting your approval.
            ${oldest > 0 ? `The oldest has been waiting <strong>${oldest} day${oldest === 1 ? '' : 's'}</strong>.` : ''}
          </p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
            <tr style="background:#f9fafb;">
              <th align="left" style="padding:10px;font-size:12px;color:#6b7280;">BATCH</th>
              <th align="left" style="padding:10px;font-size:12px;color:#6b7280;">SUPPLIER</th>
              <th align="left" style="padding:10px;font-size:12px;color:#6b7280;">MC</th>
              <th align="left" style="padding:10px;font-size:12px;color:#6b7280;">SUGGESTED</th>
              <th align="left" style="padding:10px;font-size:12px;color:#6b7280;">ASSESSED BY</th>
              <th align="left" style="padding:10px;font-size:12px;color:#6b7280;">SUBMITTED</th>
            </tr>
            ${rows(list)}
          </table>
          <div style="text-align:center;margin:24px 0 6px;">
            <a href="${APP_URL}" style="background:#b45309;color:#ffffff;text-decoration:none;padding:12px 26px;border-radius:8px;font-size:14px;font-weight:600;display:inline-block;">Open Quality Approvals</a>
          </div>
          <p style="font-size:13px;color:#6b7280;line-height:1.6;margin:16px 0 0;">
            Lots remain on hold until you approve, adjust or reject them — they cannot proceed to Admin pricing or Finance before your review.
          </p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:18px 28px;border-top:1px solid #e5e7eb;text-align:center;">
          <div style="font-size:13px;color:#374151;font-weight:600;">Great Agro Coffee &mdash; Member of Hello YEDA COFFEE COMPANY LIMITED</div>
          <div style="font-size:12px;color:#9ca3af;margin-top:4px;">Head Office &middot; P.O Box 431420, Kasese, Uganda &middot; Operations: +256 393 101 103</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`

const TEXT = (name: string, list: any[]) => `Dear ${name || 'Head of Quality'},

QUALITY APPROVALS PENDING

You have ${list.length} quality assessment(s) awaiting your approval:

${list.map((a: any) => `- ${a.batch_number || '—'} | ${a.supplier_name || '—'} | MC ${a.moisture ?? '—'}% | ${money(a.suggested_price)} | by ${a.assessed_by || '—'} | ${day(a.created_at)}`).join('\n')}

Open: ${APP_URL}

- Great Agro Coffee
Member of Hello YEDA COFFEE COMPANY LIMITED`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')
  if (!lovableApiKey) {
    return new Response(JSON.stringify({ ok: false, error: 'Email service not configured' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const { data: pending, error } = await supabase
    .from('quality_assessments')
    .select('batch_number, supplier_name, moisture, suggested_price, assessed_by, created_at')
    .eq('status', 'pending_quality_manager')
    .order('created_at', { ascending: true })
    .limit(100)

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const list = pending || []
  if (list.length === 0) {
    return new Response(JSON.stringify({ ok: true, pending: 0, sent: 0, message: 'No pending quality approvals' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const oldestDays = Math.floor((Date.now() - new Date(list[0].created_at as string).getTime()) / 86400000)

  const { data: employees } = await supabase
    .from('employees')
    .select('name, email, role, position, status, disabled')
    .eq('status', 'Active')

  const heads = (employees || []).filter((e: any) => {
    if (!e.email || e.disabled === true) return false
    const blob = `${e.role || ''} ${e.position || ''}`.toLowerCase()
    return blob.includes('quality manager') || blob.includes('head of quality')
  })

  const stamp = new Date().toISOString().slice(0, 13) // hourly bucket, avoids duplicates
  const results: Array<{ email: string; status: string }> = []
  const seen = new Set<string>()

  for (const e of heads as any[]) {
    const email = String(e.email).trim()
    const key = email.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    try {
      const idem = `quality-pending-digest-${stamp}-${list.length}-${key}`
      await sendLovableEmail(
        {
          to: email,
          from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
          sender_domain: SENDER_DOMAIN,
          subject: `Quality approvals pending — ${list.length} lot${list.length === 1 ? '' : 's'} awaiting your review`,
          html: HTML(e.name, list, oldestDays),
          text: TEXT(e.name, list),
          purpose: 'transactional',
          label: 'quality-pending-approvals',
          idempotency_key: idem,
          unsubscribe_token: token(),
          cc: [OPERATIONS_EMAIL],
        },
        { apiKey: lovableApiKey, idempotencyKey: idem }
      )
      results.push({ email, status: 'sent' })
    } catch (err: any) {
      results.push({ email, status: `failed: ${err.message}` })
    }
  }

  return new Response(JSON.stringify({ ok: true, pending: list.length, sent: results.filter(r => r.status === 'sent').length, results }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})