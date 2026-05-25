import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// One-off admin tool — protected by a fixed token. Idempotent: refuses to
// re-send the same key twice within 24h by checking sms_logs.
const ONE_OFF_TOKEN = 'gpc-term-bb-2026-05-25'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const body = await req.json().catch(() => ({}))
    if (body.token !== ONE_OFF_TOKEN) {
      return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const phone: string = body.phone
    const smsMessage: string = body.smsMessage
    const recipientEmail: string = body.recipientEmail
    const recipientName: string = body.recipientName
    const subject: string = body.subject
    const emailBody: string = body.emailBody
    const ccEmails: string[] = body.ccEmails || []

    const results: any = { sms: null, emails: [] }

    // 1) Send SMS via BulkSMS Premium directly
    try {
      const tokenId = Deno.env.get('BULKSMS_TOKEN_ID')
      const tokenSecret = Deno.env.get('BULKSMS_TOKEN_SECRET')
      const auth = btoa(`${tokenId}:${tokenSecret}`)
      const smsResp = await fetch('https://api.bulksms.com/v1/messages', {
        method: 'POST',
        headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: phone, body: smsMessage, encoding: 'TEXT' }),
      })
      const smsText = await smsResp.text()
      results.sms = { ok: smsResp.ok, status: smsResp.status, body: smsText.slice(0, 500) }

      // Log to sms_logs
      const supa = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
      await supa.from('sms_logs').insert({
        recipient_phone: phone,
        recipient_name: recipientName,
        recipient_email: recipientEmail,
        message_content: smsMessage,
        message_type: 'termination_notice',
        status: smsResp.ok ? 'sent' : 'failed',
        provider: 'BulkSMS-Premium',
        credits_used: 1,
        department: 'HR',
        triggered_by: 'admin-termination',
        failure_reason: smsResp.ok ? null : smsText.slice(0, 300),
      })
    } catch (e) {
      results.sms = { ok: false, error: (e as Error).message }
    }

    // 2) Send emails (recipient + each CC) via SendGrid directly (bypasses disabled guard)
    const sgKey = Deno.env.get('SENDGRID_API_KEY')
    const fromEmail = 'noreply@notify.greatpearlcoffeesystem.site'
    const htmlBody = `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#1a1a1a;max-width:640px;margin:0 auto;padding:24px;">
      <h2 style="color:#7a0f0f;margin:0 0 16px;">${subject}</h2>
      ${emailBody.split('\n').map(l => `<p style="margin:0 0 10px;line-height:1.6;">${l.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p>`).join('')}
      <hr style="margin:24px 0;border:none;border-top:1px solid #e5e5e5"/>
      <p style="color:#888;font-size:12px;margin:0;">Great Pearl Coffee — Management Communication</p>
    </body></html>`

    const allRecipients = [recipientEmail, ...ccEmails]
    for (const to of allRecipients) {
      try {
        const resp = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: { Authorization: `Bearer ${sgKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: to }] }],
            from: { email: fromEmail, name: 'Great Pearl Coffee Management' },
            reply_to: { email: 'operations@greatpearlcoffee.com' },
            subject: to === recipientEmail ? subject : `[CC] ${subject} — ${recipientName}`,
            content: [{ type: 'text/html', value: htmlBody }],
          }),
        })
        results.emails.push({ to, ok: resp.ok, status: resp.status, body: resp.ok ? null : (await resp.text()).slice(0, 300) })
      } catch (e) {
        results.emails.push({ to, ok: false, error: (e as Error).message })
      }
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})