import { sendLovableEmail } from 'npm:@lovable.dev/email-js@0.0.4'

const SITE_NAME = 'Great Agro Coffee'
const SENDER_DOMAIN = 'notify.greatpearlcoffeesystem.site'
const FROM_DOMAIN = 'notify.greatpearlcoffeesystem.site'
const OPERATIONS_EMAIL = 'operations@greatpearlcoffee.com'
const ADMIN_EMAIL = 'Fauzakusa@greatpearlcoffee.com'
const LOGO_URL = 'https://great-pearl-traceability-system.lovable.app/lovable-uploads/great-agro-coffee-logo.png'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function token(): string {
  const b = new Uint8Array(32); crypto.getRandomValues(b)
  return Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('')
}

const PRIMARY = [
  { name: 'Nuwagaba Gadaffi', email: 'nuwagabagadaffi@greatpearlcoffee.com' },
  { name: 'Onesmus Rubambura', email: 'onesmusrubambura@greatpearlcoffee.com' },
  { name: 'Tumwine Alex', email: 'tumwinealex@greatpearlcoffee.com' },
]

const CC = [
  'nickscott@greatpearlcoffee.com',
  'bwambalemorjalia@greatpearlcoffee.com',
  'bwambaledenis@greatpearlcoffee.com',
  'Musemawyclif@greatpearlcoffee.com',
  OPERATIONS_EMAIL,
  ADMIN_EMAIL,
]

const SUBJECT = 'Immediate Action Required: Quality Variations and Department Performance'

const shell = (title: string, body: string) => `<!doctype html>
<html><body style="margin:0;padding:0;background:#f4f4f5;font-family:'Helvetica Neue',Arial,sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#7f1d1d 0%,#b91c1c 100%);padding:30px;text-align:center;">
          <img src="${LOGO_URL}" alt="Great Agro Coffee" width="60" height="60" style="display:inline-block;border-radius:12px;background:#ffffff;padding:6px;margin-bottom:10px;" />
          <div style="color:#fee2e2;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Great Agro Coffee</div>
          <h1 style="color:#ffffff;font-size:20px;margin:10px 0 0;font-weight:700;">${title}</h1>
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

const HTML = (name: string) => shell('IMMEDIATE ACTION REQUIRED', `
  <p style="font-size:16px;margin:0 0 14px;">Dear <strong>${name || 'Quality Team'}</strong>,</p>
  <p style="font-size:15px;line-height:1.75;margin:0 0 14px;">
    I am writing to express my disappointment regarding the continued quality variations we are experiencing between our dispatch
    analyses and the receiving analyses conducted by <strong>Kyagalanyi Coffee Ltd (KCL)</strong>.
  </p>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 16px;">
    <tr><td style="background:#fef2f2;border-left:4px solid #b91c1c;padding:18px 20px;border-radius:6px;font-size:14px;color:#374151;line-height:1.8;">
      KCL is reporting <strong>Group 1 defects of up to 17%</strong> on coffee dispatched from our stores, yet according to our own
      quality reports we have not been receiving or purchasing coffee with such high levels of black defects. This raises serious
      concerns about the consistency and accuracy of our sampling and quality assessment procedures.
    </td></tr>
  </table>
  <p style="font-size:15px;line-height:1.75;margin:0 0 14px;">
    As our customer and final buyer, <strong>Kyagalanyi's quality assessment is the benchmark against which our coffee is ultimately
    evaluated.</strong> We must therefore align our internal quality assessments with their standards. If there are differences in
    sampling methods, grading procedures, or interpretation of quality parameters, these must be identified and corrected immediately.
    We cannot continue dispatching coffee with expectations that do not match the buyer's findings.
  </p>
  <p style="font-size:15px;line-height:1.75;margin:0 0 14px;">
    Secondly, I previously instructed that <strong>all coffee currently in store must be reassessed without exception</strong> to ensure
    we have an accurate understanding of the quality of our stock before dispatch. Unfortunately, I have not seen this instruction
    reflected in the system or in the department's activities. This is a direct management directive and must be implemented immediately.
  </p>
  <p style="font-size:15px;line-height:1.75;margin:0 0 14px;">
    I am also concerned about the level of commitment within the department during this peak season. We are in one of the busiest periods
    of the coffee business, yet it is surprising to see staff leaving early. The Quality Department plays a critical role in our operations
    and should, in most cases, be the <strong>last department to leave</strong>, ensuring that all coffee received that day has been
    properly analysed and that no pending work is left behind.
  </p>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 16px;">
    <tr><td style="background:#fffbeb;border-left:4px solid #d97706;padding:18px 20px;border-radius:6px;">
      <div style="font-weight:600;color:#92400e;font-size:15px;margin-bottom:10px;">With immediate effect, I expect the following</div>
      <div style="font-size:14px;color:#374151;line-height:1.9;">
        &bull; A review of all quality assessment procedures to ensure they are aligned with buyer expectations.<br/>
        &bull; Immediate reassessment of all coffee currently in store, with the results updated in the system.<br/>
        &bull; A report explaining the causes of the repeated quality variations between our dispatch reports and KCL's receiving analyses.<br/>
        &bull; Full commitment from all Quality Department staff during this coffee season, ensuring daily work is completed before leaving the premises.
      </div>
    </td></tr>
  </table>
  <p style="font-size:15px;line-height:1.75;margin:0 0 14px;">
    Our reputation, customer confidence, and financial performance depend on the accuracy of the work carried out by the Quality Department.
    I therefore expect immediate improvement and full cooperation from every member of the team.
  </p>
  <p style="font-size:15px;line-height:1.75;margin:0 0 18px;">Kindly treat this matter with the urgency it deserves.</p>
  <p style="font-size:15px;margin:0;">Regards,<br/><strong>Fauza Kusa</strong><br/>Management &mdash; Great Agro Coffee</p>
`)

const TEXT = (name: string) => `Dear ${name || 'Quality Team'},

IMMEDIATE ACTION REQUIRED: QUALITY VARIATIONS AND DEPARTMENT PERFORMANCE

I am disappointed by the continued quality variations between our dispatch analyses and the receiving analyses conducted by Kyagalanyi Coffee Ltd (KCL). KCL is reporting Group 1 defects of up to 17% on coffee dispatched from our stores, which does not match our own quality reports. This raises serious concerns about the consistency and accuracy of our sampling and assessment procedures.

Kyagalanyi's assessment is the benchmark against which our coffee is ultimately evaluated. Any differences in sampling methods, grading procedures or interpretation of parameters must be identified and corrected immediately.

I previously instructed that all coffee currently in store must be reassessed without exception. This has not been reflected in the system or the department's activities and must be implemented immediately.

I am also concerned about commitment during this peak season. The Quality Department should in most cases be the last department to leave, ensuring all coffee received that day has been analysed.

With immediate effect I expect:
- A review of all quality assessment procedures to align with buyer expectations.
- Immediate reassessment of all coffee in store, with results updated in the system.
- A report explaining the causes of the repeated variations vs KCL's receiving analyses.
- Full commitment from all Quality Department staff, completing daily work before leaving.

Kindly treat this matter with the urgency it deserves.

Regards,
Fauza Kusa
Great Agro Coffee - Member of Hello YEDA COFFEE COMPANY LIMITED
Head Office - P.O Box 431420, Kasese, Uganda - Operations: +256 393 101 103`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')
  if (!lovableApiKey) {
    return new Response(JSON.stringify({ ok: false, error: 'Email service not configured' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const results: Array<{ email: string; status: string }> = []

  for (const p of PRIMARY) {
    const idem = `quality-variance-directive-2026-08-05-${p.email.toLowerCase()}`
    try {
      await sendLovableEmail(
        {
          to: p.email,
          from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
          sender_domain: SENDER_DOMAIN,
          subject: SUBJECT,
          html: HTML(p.name),
          text: TEXT(p.name),
          purpose: 'transactional',
          label: 'quality-variance-directive',
          idempotency_key: idem,
          unsubscribe_token: token(),
          cc: CC,
        },
        { apiKey: lovableApiKey, idempotencyKey: idem }
      )
      results.push({ email: p.email, status: 'sent' })
    } catch (err: any) {
      results.push({ email: p.email, status: `failed: ${err.message}` })
    }
  }

  const sent = results.filter(r => r.status === 'sent').length
  return new Response(JSON.stringify({ ok: true, total: results.length, sent, failed: results.length - sent, results }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})
