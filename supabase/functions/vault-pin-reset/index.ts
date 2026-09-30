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

    const body = await req.json().catch(() => ({}))
    const paid = body?.mode === 'paid_recover'
    let recoveredPin = ''
    let recoveredFee = 1000
    let recoveredOverdraft = false
    if (paid) {
      const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      })
      const { data: r, error: rErr } = await userClient.rpc('vault_paid_pin_recovery')
      if (rErr) return json({ ok: false, error: 'RECOVERY_FAILED', message: rErr.message })
      if (!r?.ok) return json(r)
      recoveredPin = r.pin
      recoveredFee = Number(r.fee) || 1000
      recoveredOverdraft = r.overdraft === true
    }

    // --- Rate limit: max 3 codes per 15 minutes ---
    const since = new Date(Date.now() - 15 * 60 * 1000).toISOString()
    const { count } = await admin
      .from('vault_reset_codes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', since)

    if (!paid && (count || 0) >= 3) {
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

    if (paid) {
      const name = emp?.name || email.split('@')[0]
      const feeText = recoveredOverdraft
        ? `UGX ${recoveredFee.toLocaleString()} charged (UGX 1,000 recovery + UGX 500 access fee) as an overdraft — your wallet is now negative and it will be repaid from your next deposits.`
        : `UGX ${recoveredFee.toLocaleString()} vault recovery fee charged.`
      const smsText = `Great Agro Coffee: ${feeText} Your vault PIN is now ${recoveredPin}. Do not share it.`
      let smsSent = 0
      for (const phone of [emp?.phone, emp?.alt_phone].filter(Boolean) as string[]) {
        try {
          const res = await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, message: smsText, userName: name, messageType: 'vault_pin_recovery', recipientEmail: email, triggeredBy: email }),
          })
          if (res.ok) smsSent++
        } catch (e) { console.error('SMS failed', e) }
      }
      let emailSent = 0
      for (const addr of [...new Set([email, emp?.alt_email].filter(Boolean) as string[])]) {
        try {
          const res = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              templateName: 'general-notification',
              recipientEmail: addr,
              idempotencyKey: `vault-recover-${user.id}-${Date.now()}`,
              templateData: {
                title: 'Vault PIN Recovered',
                subject: 'Your wallet vault PIN',
                recipientName: name,
                message: `${feeText}\n\nYour vault PIN is now: ${recoveredPin}\n\nYou can keep using it or change it from the vault screen. If you did not request this, tell management immediately.`,
              },
            }),
          })
          if (res.ok) emailSent++
        } catch (e) { console.error('Email failed', e) }
      }
      return json({ ok: true, pin: recoveredPin, fee: recoveredFee, overdraft: recoveredOverdraft, smsSent, emailSent })
    }

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
