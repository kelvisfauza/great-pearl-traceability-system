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

const SUBJECT = "New: Withdraw your wallet money straight to your bank account"

const HTML = (name: string) => `<!doctype html>
<html><body style="margin:0;padding:0;background:#f4f4f5;font-family:'Helvetica Neue',Arial,sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#065f46 0%,#047857 100%);padding:32px;text-align:center;">
          <img src="${LOGO_URL}" alt="Great Agro Coffee" width="64" height="64" style="display:inline-block;border-radius:12px;background:#ffffff;padding:6px;margin-bottom:12px;" />
          <div style="color:#d1fae5;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Great Agro Coffee</div>
          <h1 style="color:#ffffff;font-size:24px;margin:10px 0 4px;font-weight:700;">BANK DEPOSIT WITHDRAWALS</h1>
          <div style="display:inline-block;background:#ecfdf5;color:#065f46;padding:6px 16px;border-radius:20px;font-size:13px;font-weight:600;margin-top:6px;">New Feature</div>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="font-size:16px;margin:0 0 14px;">Dear <strong>${name || 'Colleague'}</strong>,</p>
          <p style="font-size:15px;line-height:1.75;margin:0 0 18px;">
            You can now withdraw money from your wallet <strong>directly to your bank account</strong>, in addition to mobile money.
            This is useful for larger amounts and for saving straight into your bank.
          </p>

          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:18px 0;">
            <tr><td style="background:#f0fdf4;border-left:4px solid #047857;padding:18px 20px;border-radius:6px;">
              <div style="font-weight:600;color:#065f46;font-size:15px;margin-bottom:10px;">How to request a bank deposit</div>
              <div style="font-size:14px;color:#374151;line-height:1.9;">
                1. Open your wallet and tap <strong>Withdraw</strong>.<br/>
                2. Enter the amount, then choose <strong>Bank Deposit</strong>.<br/>
                3. Select or type your <strong>bank</strong>, branch (optional), <strong>account number</strong> and <strong>account name</strong>.<br/>
                4. Submit for approval.
              </div>
            </td></tr>
          </table>

          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px;">
            <tr><td style="background:#fffbeb;border:1px solid #fcd34d;padding:16px 18px;border-radius:8px;">
              <div style="font-weight:600;color:#92400e;font-size:14px;margin-bottom:6px;">Important to know</div>
              <div style="font-size:14px;color:#374151;line-height:1.7;">
                &bull; A <strong>service fee</strong> applies, same tiers as mobile money withdrawals (UGX 1,100 / 1,700 / 2,500 / 2,900 depending on amount).<br/>
                &bull; The amount <strong>plus the fee</strong> is deducted from your wallet.<br/>
                &bull; Requests are reviewed by an administrator, and <strong>final approval and payment is done by the Managing Director</strong>.<br/>
                &bull; <strong>No money leaves your wallet until the payment is marked as paid.</strong><br/>
                &bull; Please double-check your account number — deposits sent to a wrong account cannot be recovered.
              </div>
            </td></tr>
          </table>

          <p style="font-size:15px;line-height:1.75;margin:0 0 18px;">
            You will receive an SMS at each stage: when your request is approved, and when the money has been deposited.
          </p>

          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr><td style="background:#f9fafb;border:1px solid #e5e7eb;padding:16px 18px;border-radius:8px;">
              <div style="font-weight:600;color:#1f2937;font-size:14px;margin-bottom:6px;">Support</div>
              <div style="font-size:14px;color:#374151;line-height:1.65;">
                Operations Office: <strong>+256 393 101 103</strong><br/>
                Email: <strong>operations@greatpearlcoffee.com</strong>
              </div>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:20px 32px;border-top:1px solid #e5e7eb;text-align:center;">
          <div style="font-size:13px;color:#374151;font-weight:600;">Great Agro Coffee &mdash; Member of Hello YEDA COFFEE COMPANY LIMITED</div>
          <div style="font-size:12px;color:#9ca3af;margin-top:4px;">Head Office &middot; P.O Box 431420, Kasese, Uganda</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`

const TEXT = (name: string) => `Dear ${name || 'Colleague'},

NEW: BANK DEPOSIT WITHDRAWALS

You can now withdraw money from your wallet directly to your bank account, in addition to mobile money.

HOW TO REQUEST
1. Open your wallet and tap Withdraw.
2. Enter the amount, then choose Bank Deposit.
3. Select or type your bank, branch (optional), account number and account name.
4. Submit for approval.

IMPORTANT
- A service fee applies (UGX 1,100 / 1,700 / 2,500 / 2,900 depending on amount).
- The amount plus the fee is deducted from your wallet.
- An administrator reviews the request; final approval and payment is done by the Managing Director.
- No money leaves your wallet until the payment is marked as paid.
- Double-check your account number.

SUPPORT
Operations Office: +256 393 101 103
Email: operations@greatpearlcoffee.com

- Great Agro Coffee
Member of Hello YEDA COFFEE COMPANY LIMITED
Head Office - P.O Box 431420, Kasese, Uganda`

const SMS = `Great Agro Coffee: NEW - You can now withdraw your wallet money straight to your BANK ACCOUNT. Open Withdraw, choose Bank Deposit, enter your bank, account number & name, then submit. Usual service fee applies and is deducted with the amount. Admin reviews, MD approves & pays. Help: +256393101103`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const { data: employees, error } = await supabase
    .from('employees')
    .select('name, email, phone, status, disabled')
    .eq('status', 'Active')

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const active = (employees || []).filter((e: any) => e.disabled !== true)

  const seenEmail = new Set<string>()
  const emailTargets = active
    .filter((e: any) => e.email)
    .map((e: any) => ({ name: e.name as string, email: (e.email as string).trim() }))
    .filter((r) => {
      const k = r.email.toLowerCase()
      if (seenEmail.has(k)) return false
      seenEmail.add(k); return true
    })

  const normalize = (p: string) => {
    let d = (p || '').replace(/\D/g, '')
    if (d.startsWith('0')) d = '256' + d.slice(1)
    if (d.length === 9) d = '256' + d
    return d
  }
  const seenPhone = new Set<string>()
  const smsTargets = active
    .filter((e: any) => e.phone)
    .map((e: any) => ({ name: e.name as string, phone: normalize(e.phone) }))
    .filter((r) => {
      if (r.phone.length < 12 || seenPhone.has(r.phone)) return false
      seenPhone.add(r.phone); return true
    })

  let emailsSent = 0
  if (lovableApiKey) {
    for (const r of emailTargets) {
      try {
        const idem = `bank-deposit-feature-2026-08-v1-${r.email.toLowerCase()}`
        await sendLovableEmail(
          { to: r.email, from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`, sender_domain: SENDER_DOMAIN,
            subject: SUBJECT, html: HTML(r.name), text: TEXT(r.name),
            purpose: 'transactional', label: 'bank-deposit-feature',
            idempotency_key: idem, unsubscribe_token: token(),
            cc: [OPERATIONS_EMAIL] },
          { apiKey: lovableApiKey, idempotencyKey: idem }
        )
        emailsSent++
      } catch (err) {
        console.error('email failed', r.email, err)
      }
    }
  }

  let smsSent = 0
  for (const r of smsTargets) {
    try {
      const { error: smsErr } = await supabase.functions.invoke('send-sms', {
        body: { phone: r.phone, message: SMS, userName: r.name, messageType: 'announcement', triggeredBy: 'Bank Deposit Feature Broadcast' },
      })
      if (!smsErr) smsSent++
    } catch (err) {
      console.error('sms failed', r.phone, err)
    }
  }

  return new Response(JSON.stringify({ ok: true, emails: emailsSent, sms: smsSent, recipients: emailTargets.length }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})