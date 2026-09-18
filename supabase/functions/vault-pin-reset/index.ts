import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(supabaseUrl, serviceKey)

    // --- Validate the caller's JWT ---
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace('Bearer ', '').trim()
    if (!token) return json({ ok: false, error: 'NOT_AUTHENTICATED' })

    const { data: userData, error: userErr } = await admin.auth.getUser(token)
    const user = userData?.user
    if (userErr || !user) return json({ ok: false, error: 'NOT_AUTHENTICATED' })

    // --- Rate limit: max 3 codes per 15 minutes ---
    const since = new Date(Date.now() - 15 * 60 * 1000).toISOString()
    const { count } = await admin
      .from('vault_reset_codes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', since)

    if ((count || 0) >= 3) {
      return json({ ok: false, error: 'RATE_LIMITED', message: 'Too many reset codes requested. Please wait 15 minutes.' })
    }

    // --- Find the employee record for phone + name ---
    const email = user.email || ''
    const { data: emp } = await admin
      .from('employees')
      .select('id, name, email, alt_email, phone, alt_phone, disabled')
      .or(`auth_user_id.eq.${user.id},email.eq.${email}`)
      .limit(1)
      .maybeSingle()

    if (emp?.disabled) return json({ ok: false, error: 'ACCOUNT_DISABLED', message: 'This account is disabled.' })

    const code = String(Math.floor(100000 + Math.random() * 900000))
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    // Hash the code before storing it
    const { data: hashed, error: hashErr } = await admin.rpc('hash_vault_reset_code', { p_code: code })
    if (hashErr || !hashed) {
      console.error('Hashing failed', hashErr)
      return json({ ok: false, error: 'HASH_FAILED', message: 'Could not create a reset code. Try again.' })
    }

    const { error: insErr } = await admin.from('vault_reset_codes').insert({
      user_id: user.id,
      code_hash: hashed,
      expires_at: expiresAt,
    })
    if (insErr) {
      console.error('Insert failed', insErr)
      return json({ ok: false, error: 'SAVE_FAILED', message: 'Could not create a reset code. Try again.' })
    }

    const name = emp?.name || email.split('@')[0]
    const smsText = `Your vault reset code is ${code}. It expires in 10 minutes. Do not share it with anyone.`

    let smsSent = 0
    const phones = [emp?.phone, emp?.alt_phone].filter(Boolean) as string[]
    for (const phone of phones) {
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone,
            message: smsText,
            userName: name,
            messageType: 'vault_reset_code',
            recipientEmail: email,
            triggeredBy: email,
          }),
        })
        if (res.ok) smsSent++
      } catch (e) {
        console.error('SMS failed', e)
      }
    }

    let emailSent = 0
    const addresses = [email, emp?.alt_email].filter(Boolean) as string[]
    for (const addr of [...new Set(addresses)]) {
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            templateName: 'general-notification',
            recipientEmail: addr,
            idempotencyKey: `vault-reset-${user.id}-${Date.now()}`,
            templateData: {
              title: 'Vault Reset Code',
              subject: 'Your wallet vault reset code',
              recipientName: name,
              message:
                `You asked to reset the PIN for your wallet vault.\n\n` +
                `Reset code: ${code}\n\n` +
                `This code expires in 10 minutes. Enter it in the vault screen to set a new 6-digit PIN.\n\n` +
                `If you did not request this, ignore this message and tell management immediately.`,
            },
          }),
        })
        if (res.ok) emailSent++
      } catch (e) {
        console.error('Email failed', e)
      }
    }

    return json({ ok: true, smsSent, emailSent, phoneCount: phones.length })
  } catch (e) {
    console.error(e)
    return json({ ok: false, error: (e as Error).message })
  }
})
