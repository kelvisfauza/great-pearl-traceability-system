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

const AMOUNT = 'UGX 5,900'
const REF = 'SEND-1780385495096-739S'
const SENDER = { name: 'Bwambale Benson', email: 'bwambalebenson@greatpearlcoffee.com' }
const RECEIVER = { name: 'Bbosa Sserunkuma Taufiq', email: 'sserunkumataufiq@greatpearlcoffee.com' }

const HTML = (name: string, role: 'sender' | 'receiver' | 'ops') => {
  const headline = role === 'sender'
    ? `${AMOUNT} has been returned to your wallet`
    : role === 'receiver'
      ? `${AMOUNT} has been reversed from your wallet`
      : `Transfer reversal confirmation`
  const body = role === 'sender'
    ? `An admin has reversed the transfer of <strong>${AMOUNT}</strong> you sent to <strong>${RECEIVER.name}</strong>. The funds have been credited back to your wallet.`
    : role === 'receiver'
      ? `An admin has reversed the transfer of <strong>${AMOUNT}</strong> you received from <strong>${SENDER.name}</strong>. The funds have been debited from your wallet and returned to the sender.`
      : `The wallet-to-wallet transfer of <strong>${AMOUNT}</strong> from <strong>${SENDER.name}</strong> to <strong>${RECEIVER.name}</strong> has been reversed by admin. Both wallets have been adjusted accordingly.`
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f5f1ea;font-family:'Helvetica Neue',Arial,sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f1ea;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(60,40,20,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#3d2817 0%,#6b4423 50%,#b45309 100%);padding:28px 28px;text-align:center;">
            <img src="${LOGO_URL}" alt="Great Agro Coffee" width="56" height="56" style="display:inline-block;border-radius:10px;background:#ffffff;padding:6px;margin-bottom:8px;" />
            <div style="color:#fde68a;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:700;">Transaction Reversal</div>
            <h1 style="color:#ffffff;font-size:22px;margin:6px 0 0;font-weight:700;">${headline}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:28px;">
            <p style="font-size:15px;margin:0 0 14px;">Dear <strong>${name}</strong>,</p>
            <p style="font-size:14px;line-height:1.7;margin:0 0 16px;color:#475569;">${body}</p>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:14px 0;background:#fffbeb;border:1px solid #fde68a;border-radius:10px;">
              <tr><td style="padding:14px 18px;font-size:13px;color:#78350f;">
                <div><strong>Amount:</strong> ${AMOUNT}</div>
                <div><strong>From:</strong> ${SENDER.name}</div>
                <div><strong>To:</strong> ${RECEIVER.name}</div>
                <div><strong>Original Ref:</strong> ${REF}</div>
                <div><strong>Reversed At:</strong> ${new Date().toLocaleString('en-GB', { timeZone: 'Africa/Kampala' })}</div>
              </td></tr>
            </table>
            <p style="font-size:13px;line-height:1.6;margin:14px 0 0;color:#64748b;">
              If you have any questions about this reversal, please contact the admin or finance team.
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  const apiKey = Deno.env.get('LOVABLE_API_KEY')
  if (!apiKey) {
    return new Response(JSON.stringify({ ok: false, error: 'Email service not configured' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const stamp = Date.now()
  const targets = [
    { ...SENDER, role: 'sender' as const, subject: `✅ ${AMOUNT} returned to your wallet — transfer reversed` },
    { ...RECEIVER, role: 'receiver' as const, subject: `↩️ ${AMOUNT} reversed from your wallet` },
    { name: 'Operations Team', email: OPERATIONS_EMAIL, role: 'ops' as const, subject: `[OPS] Transfer reversal — ${AMOUNT} ${SENDER.name} → ${RECEIVER.name}` },
    { name: 'Admin', email: ADMIN_EMAIL, role: 'ops' as const, subject: `[ADMIN] Transfer reversal confirmed — ${AMOUNT}` },
  ]

  const results: Array<{ email: string; status: string }> = []
  for (const t of targets) {
    try {
      const idem = `transfer-reversal-${REF}-${t.role}-${t.email.toLowerCase()}-${stamp}`
      await sendLovableEmail(
        { to: t.email, from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`, sender_domain: SENDER_DOMAIN,
          subject: t.subject, html: HTML(t.name, t.role),
          purpose: 'transactional', label: 'transfer-reversal-confirmation',
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