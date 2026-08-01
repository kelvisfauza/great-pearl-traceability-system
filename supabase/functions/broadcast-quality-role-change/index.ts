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

const SUBJECT = 'Quality Department — New approval workflow & access changes (effective immediately)'

const shell = (title: string, body: string) => `<!doctype html>
<html><body style="margin:0;padding:0;background:#f4f4f5;font-family:'Helvetica Neue',Arial,sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#065f46 0%,#047857 100%);padding:30px;text-align:center;">
          <img src="${LOGO_URL}" alt="Great Agro Coffee" width="60" height="60" style="display:inline-block;border-radius:12px;background:#ffffff;padding:6px;margin-bottom:10px;" />
          <div style="color:#d1fae5;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Great Agro Coffee</div>
          <h1 style="color:#ffffff;font-size:22px;margin:10px 0 0;font-weight:700;">${title}</h1>
        </td></tr>
        <tr><td style="padding:30px;">${body}</td></tr>
        <tr><td style="background:#f9fafb;padding:20px 30px;border-top:1px solid #e5e7eb;text-align:center;">
          <div style="font-size:13px;color:#374151;font-weight:600;">Great Agro Coffee &mdash; Member of Hello YEDA COFFEE COMPANY LIMITED</div>
          <div style="font-size:12px;color:#9ca3af;margin-top:4px;">Head Office &middot; P.O Box 431420, Kasese, Uganda &middot; Operations: +256 393 101 103</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`

const HEAD_HTML = (name: string) => shell('QUALITY DEPARTMENT UPDATE', `
  <p style="font-size:16px;margin:0 0 14px;">Dear <strong>${name || 'Colleague'}</strong>,</p>
  <p style="font-size:15px;line-height:1.75;margin:0 0 16px;">
    Management has restructured access and approvals within the Quality Department. As <strong>Head of Quality / Quality Manager</strong>,
    you now hold the final say on quality pricing before any lot moves on to Admin and Finance.
  </p>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 18px;">
    <tr><td style="background:#ecfdf5;border-left:4px solid #059669;padding:18px 20px;border-radius:6px;">
      <div style="font-weight:600;color:#065f46;font-size:15px;margin-bottom:10px;">What you can now do</div>
      <div style="font-size:14px;color:#374151;line-height:1.9;">
        &bull; Review, adjust or reject every price submitted by quality personnel (new <strong>Approvals</strong> tab)<br/>
        &bull; Print and reprint GRNs<br/>
        &bull; Access History, Reports, Analytics, Recommendations and Team Performance<br/>
        &bull; See department performance and each officer's output
      </div>
    </td></tr>
  </table>
  <p style="font-size:15px;line-height:1.75;margin:0 0 16px;">
    Every review you make is recorded for audit. You will also receive an email report whenever lots are waiting for your approval.
  </p>
  <p style="font-size:15px;line-height:1.75;margin:0;">Thank you for keeping our quality standards firm.</p>
`)

const STAFF_HTML = (name: string) => shell('QUALITY DEPARTMENT UPDATE', `
  <p style="font-size:16px;margin:0 0 14px;">Dear <strong>${name || 'Colleague'}</strong>,</p>
  <p style="font-size:15px;line-height:1.75;margin:0 0 16px;">
    Management has restructured how quality work is approved. Effective immediately, all coffee assessments and suggested prices
    entered by quality personnel are submitted to the <strong>Head of Quality</strong> for approval before going to Admin and Finance.
  </p>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 18px;">
    <tr><td style="background:#eff6ff;border-left:4px solid #2563eb;padding:18px 20px;border-radius:6px;">
      <div style="font-weight:600;color:#1e3a8a;font-size:15px;margin-bottom:10px;">What this means for you</div>
      <div style="font-size:14px;color:#374151;line-height:1.9;">
        &bull; Continue assessing coffee and entering the suggested price as usual<br/>
        &bull; Your submission now goes to the Head of Quality, who may approve, adjust or reject it<br/>
        &bull; GRN printing and reprinting is now done by the Head of Quality<br/>
        &bull; Reports, History, Analytics and Performance are restricted to the Head of Quality<br/>
        &bull; Your dashboard shows how many of your lots are awaiting the manager's approval
      </div>
    </td></tr>
  </table>
  <p style="font-size:15px;line-height:1.75;margin:0 0 16px;">
    Please make sure the <strong>form number</strong> and the name of the officer who did the physical analysis are captured on every assessment.
  </p>
  <p style="font-size:15px;line-height:1.75;margin:0;">Thank you for your cooperation.</p>
`)

const TEXT = (name: string, head: boolean) => `Dear ${name || 'Colleague'},

QUALITY DEPARTMENT UPDATE

${head
  ? `As Head of Quality you now approve, adjust or reject all prices submitted by quality personnel before they move to Admin and Finance. You also handle GRN printing/reprinting and have access to History, Reports, Analytics, Recommendations and Team Performance. All reviews are recorded for audit, and you will receive an email report when lots are awaiting your approval.`
  : `All coffee assessments and suggested prices you enter are now submitted to the Head of Quality for approval before going to Admin and Finance. GRN printing/reprinting, Reports, History, Analytics and Performance are restricted to the Head of Quality. Your dashboard shows how many of your lots are awaiting approval. Please always capture the form number and the officer who did the physical analysis.`}

- Great Agro Coffee
Member of Hello YEDA COFFEE COMPANY LIMITED
Head Office - P.O Box 431420, Kasese, Uganda - Operations: +256 393 101 103`

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
    .select('name, email, role, position, department, status, disabled')
    .eq('status', 'Active')

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const quality = (employees || []).filter((e: any) => {
    if (!e.email || e.disabled === true) return false
    const blob = `${e.department || ''} ${e.position || ''} ${e.role || ''}`.toLowerCase()
    return blob.includes('quality')
  })

  const seen = new Set<string>()
  const results: Array<{ email: string; status: string }> = []

  for (const e of quality as any[]) {
    const email = String(e.email).trim()
    const key = email.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)

    const blob = `${e.role || ''} ${e.position || ''}`.toLowerCase()
    const isHead = blob.includes('quality manager') || blob.includes('head of quality')

    try {
      const idem = `quality-role-change-2026-08-01-v1-${key}`
      await sendLovableEmail(
        {
          to: email,
          from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
          sender_domain: SENDER_DOMAIN,
          subject: SUBJECT,
          html: isHead ? HEAD_HTML(e.name) : STAFF_HTML(e.name),
          text: TEXT(e.name, isHead),
          purpose: 'transactional',
          label: 'quality-role-change',
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

  const sent = results.filter(r => r.status === 'sent').length
  return new Response(JSON.stringify({ ok: true, total: results.length, sent, failed: results.length - sent, results }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})