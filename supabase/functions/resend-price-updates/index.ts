import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

// One-off / on-demand resender for failed price_update SMS.
// Sends directly via YoolaSMS using LOCAL Uganda format (07XXXXXXXX),
// which is the format the account accepts (+256 is rejected as international).
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const apiKey = Deno.env.get('YOOLA_SMS_API_KEY')
    if (!apiKey) {
      return new Response(JSON.stringify({ ok: false, error: 'Missing YOOLA_SMS_API_KEY' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let body: Record<string, unknown> = {}
    try { body = await req.json() } catch { /* no body */ }
    const day = typeof body.date === 'string' ? body.date : new Date().toISOString().slice(0, 10)
    const dryRun = body.dry_run === true

    const { data: rows, error } = await supabase
      .from('sms_logs')
      .select('recipient_phone, recipient_name, message_content, created_at')
      .eq('message_type', 'price_update')
      .eq('status', 'failed')
      .gte('created_at', `${day}T00:00:00Z`)
      .lt('created_at', `${day}T23:59:59Z`)
      .limit(2000)

    if (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Deduplicate by local phone number
    const targets = new Map<string, { message: string; name: string | null }>()
    for (const r of rows ?? []) {
      const local = String(r.recipient_phone ?? '').trim().replace(/^\+?256/, '0')
      if (!/^07\d{8}$/.test(local)) continue
      if (!targets.has(local)) targets.set(local, { message: r.message_content ?? '', name: r.recipient_name ?? null })
    }

    if (dryRun) {
      return new Response(JSON.stringify({ ok: true, dry_run: true, count: targets.size, numbers: [...targets.keys()] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let sent = 0
    let failed = 0
    const errors: string[] = []

    for (const [phone, info] of targets) {
      try {
        const res = await fetch('https://yoolasms.com/api/v1/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, message: info.message, api_key: apiKey }),
        })
        const text = await res.text()
        const success = res.ok && /"status"\s*:\s*"success"/.test(text)
        if (success) sent++; else { failed++; errors.push(`${phone}: ${text.slice(0, 140)}`) }

        await supabase.from('sms_logs').insert({
          recipient_phone: phone,
          recipient_name: info.name,
          message_content: info.message,
          message_type: 'price_update',
          status: success ? 'sent' : 'failed',
          provider: 'YoolaSMS',
          provider_response: text.slice(0, 2000),
          failure_reason: success ? null : text.slice(0, 500),
        })
      } catch (e) {
        failed++
        errors.push(`${phone}: ${(e as Error).message}`)
      }
      await new Promise((r) => setTimeout(r, 2500))
    }

    return new Response(JSON.stringify({ ok: true, date: day, total: targets.size, sent, failed, errors: errors.slice(0, 10) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
