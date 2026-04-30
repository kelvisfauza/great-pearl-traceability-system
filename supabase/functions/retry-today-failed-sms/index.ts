import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') || 'https://pudfybkyfedeggmokhco.supabase.co',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const apiKey = Deno.env.get('YOOLA_SMS_API_KEY')
  if (!apiKey) {
    return new Response(JSON.stringify({ ok: false, error: 'YOOLA_SMS_API_KEY not configured' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const startOfDay = new Date(); startOfDay.setUTCHours(0,0,0,0)

  // Fetch all of today's failed messages
  const { data: failed, error } = await supabase
    .from('sms_logs')
    .select('id, recipient_phone, message_content, retry_count, created_at')
    .eq('status', 'failed')
    .gte('created_at', startOfDay.toISOString())
    .order('created_at', { ascending: true })

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  if (!failed || failed.length === 0) {
    return new Response(JSON.stringify({ ok: true, message: 'No failed messages today', total: 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // Dedupe: keep only the FIRST occurrence per (phone + content). Skip the rest.
  const seen = new Set<string>()
  const toRetry: typeof failed = []
  const skippedDuplicateIds: string[] = []
  for (const m of failed) {
    const key = `${m.recipient_phone}::${m.message_content}`
    if (seen.has(key)) {
      skippedDuplicateIds.push(m.id)
    } else {
      seen.add(key)
      toRetry.push(m)
    }
  }

  // Mark duplicates as 'skipped_duplicate' so they don't get retried again later
  if (skippedDuplicateIds.length > 0) {
    await supabase
      .from('sms_logs')
      .update({
        status: 'skipped_duplicate',
        failure_reason: 'Skipped — duplicate of another failed message retried today',
        updated_at: new Date().toISOString(),
      })
      .in('id', skippedDuplicateIds)
  }

  let sent = 0, stillFailed = 0
  const results: any[] = []

  for (const msg of toRetry) {
    const newRetryCount = (msg.retry_count || 0) + 1
    try {
      const resp = await fetch('https://yoolasms.com/api/v1/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: msg.recipient_phone,
          message: msg.message_content,
          api_key: apiKey,
        }),
      })

      const text = await resp.text()
      let parsed: any = {}
      try { parsed = text.trim() ? JSON.parse(text) : { status: 'success' } } catch { parsed = { raw: text } }

      const ok = resp.ok && parsed?.status !== 'insufficient_fund' && parsed?.code !== 403

      if (ok) {
        await supabase.from('sms_logs').update({
          status: 'sent',
          provider: 'yoolasms',
          provider_response: parsed,
          retry_count: newRetryCount,
          last_retry_at: new Date().toISOString(),
          next_retry_at: null,
          failure_reason: null,
          credits_used: parsed.credits_used || 1,
          updated_at: new Date().toISOString(),
        }).eq('id', msg.id)
        sent++
        results.push({ id: msg.id, phone: msg.recipient_phone, status: 'sent' })
      } else {
        await supabase.from('sms_logs').update({
          retry_count: newRetryCount,
          last_retry_at: new Date().toISOString(),
          failure_reason: `YoolaSMS retry: ${text}`,
          updated_at: new Date().toISOString(),
        }).eq('id', msg.id)
        stillFailed++
        results.push({ id: msg.id, phone: msg.recipient_phone, status: 'failed', error: text })
      }
    } catch (e: any) {
      await supabase.from('sms_logs').update({
        retry_count: newRetryCount,
        last_retry_at: new Date().toISOString(),
        failure_reason: `Exception: ${e.message}`,
        updated_at: new Date().toISOString(),
      }).eq('id', msg.id)
      stillFailed++
      results.push({ id: msg.id, phone: msg.recipient_phone, status: 'error', error: e.message })
    }

    await new Promise(r => setTimeout(r, 400))
  }

  return new Response(JSON.stringify({
    ok: true,
    totalFailedToday: failed.length,
    duplicatesSkipped: skippedDuplicateIds.length,
    attempted: toRetry.length,
    sent,
    stillFailed,
    results,
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})