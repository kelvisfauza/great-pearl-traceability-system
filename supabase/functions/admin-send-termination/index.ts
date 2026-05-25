import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

    // 1) SMS via BulkSMS — try multiple credential sets
    const credSets: { name: string; auth: string }[] = []
    const basic = Deno.env.get('BULK_SMS_BASIC_AUTH')
    if (basic) credSets.push({ name: 'BULK_SMS_BASIC_AUTH', auth: basic.startsWith('Basic ') ? basic.slice(6) : basic })
    const id1 = Deno.env.get('BULKSMS_TOKEN_ID'); const s1 = Deno.env.get('BULKSMS_TOKEN_SECRET')
    if (id1 && s1) credSets.push({ name: 'BULKSMS_TOKEN_ID', auth: btoa(`${id1}:${s1}`) })
    const id2 = Deno.env.get('BULK_SMS_TOKEN_ID'); const s2 = Deno.env.get('BULK_SMS_TOKEN_SECRET')
    if (id2 && s2) credSets.push({ name: 'BULK_SMS_TOKEN_ID', auth: btoa(`${id2}:${s2}`) })

    const attempts: any[] = []
    let smsOk = false
    let smsFinal: any = null
    for (const c of credSets) {
      try {
        const r = await fetch('https://api.bulksms.com/v1/messages', {
          method: 'POST',
          headers: { Authorization: `Basic ${c.auth}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: phone, body: smsMessage, encoding: 'TEXT' }),
        })
        const t = await r.text()
        attempts.push({ creds: c.name, status: r.status, body: t.slice(0, 200) })
        if (r.ok) { smsOk = true; smsFinal = { ok: true, status: r.status, body: t.slice(0, 300), creds: c.name }; break }
      } catch (e) {
        attempts.push({ creds: c.name, error: (e as Error).message })
      }
    }
    if (!smsOk) smsFinal = { ok: false, attempts }
    results.sms = smsFinal

    try {
      const supa = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
      await supa.from('sms_logs').insert({
        recipient_phone: phone,
        recipient_name: recipientName,
        recipient_email: recipientEmail,
        message_content: smsMessage,
        message_type: 'termination_notice',
        status: smsOk ? 'sent' : 'failed',
        provider: 'BulkSMS-Premium',
        credits_used: 1,
        department: 'HR',
        triggered_by: 'admin-termination',
        failure_reason: smsOk ? null : JSON.stringify(attempts).slice(0, 400),
      })
    } catch {}

    // 2) Emails via internal send-transactional-email (verified Lovable domain)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const allRecipients = [recipientEmail, ...ccEmails]
    for (const to of allRecipients) {
      try {
        const isPrimary = to === recipientEmail
        const resp = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            apikey: serviceKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            templateName: 'general-notification',
            recipientEmail: to,
            idempotencyKey: `termination-bb-${to}-2026-05-25`,
            templateData: {
              title: subject,
              subject: isPrimary ? subject : `[CC] ${subject} — ${recipientName}`,
              message: emailBody,
              recipientName: isPrimary ? recipientName : 'Administrator',
            },
          }),
        })
        const respText = await resp.text()
        results.emails.push({ to, ok: resp.ok, status: resp.status, body: respText.slice(0, 300) })
        await new Promise(r => setTimeout(r, 250))
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
