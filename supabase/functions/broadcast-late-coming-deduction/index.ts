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

const SUBJECT = 'IMPORTANT: Late-Coming Deductions on This Month\u2019s Salary'

const HTML = (name: string) => `<!doctype html>
<html><body style="margin:0;padding:0;background:#f5f1ea;font-family:'Helvetica Neue',Arial,sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f1ea;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(60,40,20,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#7f1d1d 0%,#b45309 60%,#d97706 100%);padding:30px 32px;text-align:center;">
            <img src="${LOGO_URL}" alt="Great Agro Coffee" width="60" height="60" style="display:inline-block;border-radius:12px;background:#ffffff;padding:6px;margin-bottom:10px;" />
            <div style="color:#fde68a;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:700;">HR &amp; Payroll Notice</div>
            <h1 style="color:#ffffff;font-size:24px;margin:8px 0 4px;font-weight:700;letter-spacing:0.5px;">Late-Coming Salary Deduction</h1>
            <div style="color:#fef3c7;font-size:13px;font-weight:500;">Effective this payroll cycle</div>
          </td>
        </tr>
        <tr>
          <td style="padding:30px 32px;">
            <p style="font-size:16px;margin:0 0 14px;">Dear <strong>${name || 'Team'}</strong>,</p>
            <p style="font-size:15px;line-height:1.7;margin:0 0 16px;color:#475569;">
              Management has noted a significant rise in <strong>late arrivals</strong>
              across departments this month. This has affected morning briefings,
              field dispatch, factory shifts and customer service \u2014 work others
              still have to absorb on your behalf.
            </p>

            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:18px 0;">
              <tr>
                <td style="background:#fef2f2;border:2px solid #b91c1c;padding:20px;border-radius:10px;">
                  <div style="font-size:12px;color:#7f1d1d;letter-spacing:3px;font-weight:700;text-align:center;">OFFICIAL POLICY ENFORCEMENT</div>
                  <div style="font-size:18px;color:#7f1d1d;font-weight:700;margin:10px 0 6px;text-align:center;">Total Late Time Will Be Deducted</div>
                  <div style="font-size:14px;color:#991b1b;text-align:center;line-height:1.6;">
                    All cumulative late hours recorded this month will be
                    <strong>deducted from your salary</strong> at the standard
                    <strong>UGX&nbsp;3,000 per hour</strong> rate (the same rate
                    applied to overtime rewards).
                  </div>
                </td>
              </tr>
            </table>

            <h3 style="font-size:15px;color:#1f2937;margin:22px 0 8px;">Why this is being enforced</h3>
            <ul style="font-size:14px;line-height:1.7;color:#475569;padding-left:20px;margin:0 0 16px;">
              <li>Salary is paid for <strong>full attended hours</strong> \u2014 it is not fair to pay full salary for partial time worked.</li>
              <li>Late arrivals disrupt operations, delay deliveries to suppliers and customers, and overload punctual colleagues.</li>
              <li>The attendance system already captures every arrival; the deduction is simply applying what the records show.</li>
              <li>Equal treatment: the same UGX 3,000/hour we reward you for overtime is the same rate we recover for missed time.</li>
            </ul>

            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:18px 0;">
              <tr>
                <td style="background:#ecfdf5;border-left:4px solid #047857;padding:14px 18px;border-radius:6px;">
                  <div style="font-weight:700;color:#064e3b;font-size:14px;margin-bottom:4px;">How to avoid the deduction next month</div>
                  <div style="font-size:13px;color:#065f46;line-height:1.6;">
                    Arrive on time, clock in via the attendance system, and if you
                    have a genuine reason for being late, submit an
                    <strong>Absence/Late Appeal</strong> in the app before payroll closes.
                  </div>
                </td>
              </tr>
            </table>

            <p style="font-size:14px;line-height:1.6;color:#4b5563;margin:18px 0 6px;">
              You can review your own attendance and total late minutes for the
              month at any time under <strong>HR \u2192 My Attendance</strong>.
              For disputes, contact HR before the 27th.
            </p>

            <p style="font-size:14px;margin:22px 0 0;color:#6b4423;font-weight:600;">\u2014 HR &amp; Management, Great Agro Coffee</p>
            <p style="font-size:12px;color:#94a3b8;margin:2px 0 0;">a member of YEDA COFFEE COMPANY LIMITED</p>
          </td>
        </tr>
        <tr>
          <td style="background:#faf6ef;padding:16px 32px;border-top:1px solid #ece4d4;text-align:center;">
            <div style="font-size:11px;color:#9ca3af;">Great Agro Coffee \u2014 P.O Box 431420, Kasese, Uganda \u00b7 +256 393 001 626 / +256 393 101 103 \u00b7 info@greatpearlcoffee.com</div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body></html>`

const TEXT = (name: string) => `Dear ${name || 'Team'},

LATE-COMING SALARY DEDUCTION \u2014 THIS MONTH'S PAYROLL

Management has noted a significant rise in late arrivals this month across departments. This has affected briefings, dispatch, factory shifts and customer service.

OFFICIAL NOTICE:
All cumulative late hours recorded this month will be DEDUCTED from your salary at the standard rate of UGX 3,000 per hour (the same rate used to pay overtime).

Why:
- Salary is paid for full attended hours; full pay for partial time is unfair to punctual staff.
- Late arrivals disrupt operations and overload colleagues who cover for you.
- The attendance system already records every arrival; the deduction simply applies what the records show.
- The recovery rate matches the overtime reward rate \u2014 equal treatment.

How to avoid it next month:
Arrive on time, clock in via the attendance system, and if you have a genuine reason, submit an Absence/Late Appeal in the app before payroll closes.

Review your attendance under HR \u2192 My Attendance. For disputes, contact HR before the 27th.

\u2014 HR & Management, Great Agro Coffee
a member of YEDA COFFEE COMPANY LIMITED
P.O Box 431420, Kasese, Uganda`

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
    .select('name, email, status, disabled')
    .eq('status', 'Active')

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const seen = new Set<string>()
  const recipients = (employees || [])
    .filter((e: any) => e.email && e.disabled !== true)
    .map((e: any) => ({ name: e.name as string, email: (e.email as string).trim() }))
    .filter(r => {
      const k = r.email.toLowerCase()
      if (seen.has(k)) return false
      seen.add(k); return true
    })

  const stamp = Date.now()
  const results: Array<{ email: string; status: string }> = []

  for (const r of recipients) {
    try {
      const idem = `late-coming-deduction-${stamp}-${r.email.toLowerCase()}`
      await sendLovableEmail(
        { to: r.email, from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`, sender_domain: SENDER_DOMAIN,
          subject: SUBJECT, html: HTML(r.name), text: TEXT(r.name),
          purpose: 'transactional', label: 'late-coming-deduction-broadcast',
          idempotency_key: idem, unsubscribe_token: token() },
        { apiKey: lovableApiKey, idempotencyKey: idem }
      )
      results.push({ email: r.email, status: 'sent' })
    } catch (err: any) {
      results.push({ email: r.email, status: `failed: ${err.message}` })
    }
  }

  // CC operations
  try {
    const opsIdem = `late-coming-deduction-ops-${stamp}`
    await sendLovableEmail(
      { to: OPERATIONS_EMAIL, from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`, sender_domain: SENDER_DOMAIN,
        subject: `[CC] ${SUBJECT} \u2014 sent to ${results.filter(r=>r.status==='sent').length}/${recipients.length}`,
        html: HTML('Operations Team'), text: TEXT('Operations Team'),
        purpose: 'transactional', label: 'late-coming-deduction-ops-cc',
        idempotency_key: opsIdem, unsubscribe_token: token() },
      { apiKey: lovableApiKey, idempotencyKey: opsIdem }
    )
  } catch (_) { /* ignore */ }

  const sent = results.filter(r => r.status === 'sent').length
  return new Response(JSON.stringify({ ok: true, total: recipients.length, sent, results }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})