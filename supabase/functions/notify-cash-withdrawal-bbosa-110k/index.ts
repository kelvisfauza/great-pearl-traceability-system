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

const AMOUNT_NUM = 110000
const AMOUNT = 'UGX 110,000'
const BALANCE = 'UGX 51,728'
const EMPLOYEE = { name: 'Bbosa Sserunkuma Taufiq', email: 'sserunkumataufiq@greatpearlcoffee.com', department: 'Sales', position: 'EUDR support' }
const APPROVED_BY = 'Fauza Kusa'
const METHOD = 'Cash (handed over in person)'
const WHEN = new Date().toLocaleString('en-GB', { timeZone: 'Africa/Kampala' })

const HTML = (name: string, role: 'employee' | 'ops') => {
  const headline = role === 'employee'
    ? `${AMOUNT} cash withdrawal confirmed`
    : `Cash withdrawal processed — ${EMPLOYEE.name}`
  const body = role === 'employee'
    ? `Dear <strong>${name}</strong>, this confirms that <strong>${AMOUNT}</strong> has been deducted from your wallet as a cash withdrawal. The cash has been handed to you in person by the admin.`
    : `A cash withdrawal of <strong>${AMOUNT}</strong> has been processed for <strong>${EMPLOYEE.name}</strong>. The amount has been deducted from the employee's wallet and disbursed in cash by the admin.`
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f5f1ea;font-family:'Helvetica Neue',Arial,sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f1ea;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(60,40,20,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#3d2817 0%,#6b4423 50%,#b45309 100%);padding:28px 28px;text-align:center;">
            <img src="${LOGO_URL}" alt="Great Agro Coffee" width="56" height="56" style="display:inline-block;border-radius:10px;background:#ffffff;padding:6px;margin-bottom:8px;" />
            <div style="color:#fde68a;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:700;">Wallet Withdrawal</div>
            <h1 style="color:#ffffff;font-size:22px;margin:6px 0 0;font-weight:700;">${headline}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:28px;">
            <p style="font-size:14px;line-height:1.7;margin:0 0 16px;color:#475569;">${body}</p>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:14px 0;background:#fffbeb;border:1px solid #fde68a;border-radius:10px;">
              <tr><td style="padding:14px 18px;font-size:13px;color:#78350f;">
                <div><strong>Employee:</strong> ${EMPLOYEE.name}</div>
                <div><strong>Department:</strong> ${EMPLOYEE.department}</div>
                <div><strong>Position:</strong> ${EMPLOYEE.position}</div>
                <div style="margin-top:6px;"><strong>Amount Deducted:</strong> ${AMOUNT}</div>
                <div><strong>Method:</strong> ${METHOD}</div>
                <div><strong>Approved By:</strong> ${APPROVED_BY}</div>
                <div><strong>Date:</strong> ${WHEN}</div>
              </td></tr>
            </table>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:14px 0;background:#064e3b;border-radius:10px;">
              <tr><td style="padding:16px 20px;text-align:center;color:#d1fae5;">
                <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;">Wallet Balance After</div>
                <div style="font-size:24px;font-weight:700;color:#ffffff;margin-top:4px;">${BALANCE}</div>
              </td></tr>
            </table>
            <p style="font-size:13px;line-height:1.6;margin:14px 0 0;color:#64748b;">
              If you did not receive this cash or have any questions, contact the admin or finance team immediately.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#1f2937;padding:18px;text-align:center;color:#9ca3af;font-size:11px;">
            ${SITE_NAME} · Kasese, Uganda
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

const TEXT = (name: string, role: 'employee' | 'ops') => {
  const lead = role === 'employee'
    ? `${AMOUNT} has been deducted from your wallet as a cash withdrawal handed to you by the admin.`
    : `Cash withdrawal of ${AMOUNT} processed for ${EMPLOYEE.name}.`
  return `Dear ${name},\n\n${lead}\n\nEmployee: ${EMPLOYEE.name}\nDepartment: ${EMPLOYEE.department}\nPosition: ${EMPLOYEE.position}\nAmount: ${AMOUNT}\nMethod: ${METHOD}\nApproved By: ${APPROVED_BY}\nDate: ${WHEN}\nWallet Balance After: ${BALANCE}\n\n— Great Agro Coffee`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  const apiKey = Deno.env.get('LOVABLE_API_KEY')
  if (!apiKey) {
    return new Response(JSON.stringify({ ok: false, error: 'Email service not configured' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const stamp = Date.now()
  const targets = [
    { name: EMPLOYEE.name, email: EMPLOYEE.email, role: 'employee' as const, subject: `✅ ${AMOUNT} cash withdrawal confirmed` },
    { name: 'Operations Team', email: OPERATIONS_EMAIL, role: 'ops' as const, subject: `[OPS] Cash withdrawal ${AMOUNT} — ${EMPLOYEE.name}` },
    { name: 'Admin', email: ADMIN_EMAIL, role: 'ops' as const, subject: `[ADMIN] Cash withdrawal processed — ${AMOUNT} to ${EMPLOYEE.name}` },
  ]

  const results: Array<{ email: string; status: string }> = []
  for (const t of targets) {
    try {
      const idem = `cash-wd-bbosa-${AMOUNT_NUM}-${t.role}-${t.email.toLowerCase()}-${stamp}`
      await sendLovableEmail(
        { to: t.email, from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`, sender_domain: SENDER_DOMAIN,
          subject: t.subject, html: HTML(t.name, t.role), text: TEXT(t.name, t.role),
          purpose: 'transactional', label: 'cash-withdrawal-confirmation',
          idempotency_key: idem, unsubscribe_token: token() },
        { apiKey, idempotencyKey: idem }
      )
      results.push({ email: t.email, status: 'sent' })
    } catch (err: any) {
      results.push({ email: t.email, status: `failed: ${err.message}` })
    }
  }

  return new Response(JSON.stringify({ ok: true, results }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})