import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RECIPIENTS = ['tatwanzire@greatpearlcoffee.com', 'fauzakusa@greatpearlcoffee.com']

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceKey)

  // Fetch unnotified errors of high/critical severity from last 24h
  const { data: errors, error } = await supabase
    .from('system_errors')
    .select('id, title, description, severity, error_type, component, url, user_email, created_at, metadata')
    .in('severity', ['high', 'critical'])
    .eq('status', 'open')
    .or('metadata->>notified_at.is.null,metadata->>notified_at.eq.')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!errors || errors.length === 0) {
    return new Response(JSON.stringify({ ok: true, sent: 0 }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Build a single hourly digest email grouping all new errors
  const nowIso = new Date().toISOString()
  const list = errors as any[]

  // Group by severity
  const bySeverity: Record<string, any[]> = { critical: [], high: [] }
  for (const e of list) {
    const sev = (e.severity || 'high').toLowerCase()
    if (!bySeverity[sev]) bySeverity[sev] = []
    bySeverity[sev].push(e)
  }

  const fmt = (e: any, idx: number) =>
    `${idx}. [${(e.severity || '').toUpperCase()}] ${e.title}\n` +
    `   • Description: ${e.description || 'n/a'}\n` +
    `   • Type: ${e.error_type || 'n/a'} | Component: ${e.component || 'n/a'}\n` +
    `   • Affected User: ${e.user_email || 'n/a'}\n` +
    `   • URL: ${e.url || 'n/a'}\n` +
    `   • Time: ${new Date(e.created_at).toLocaleString()}\n`

  const sections: string[] = []
  sections.push(`Hourly System Error Digest`)
  sections.push(`Total new errors: ${list.length} (Critical: ${bySeverity.critical.length}, High: ${bySeverity.high.length})`)
  sections.push(`Window: last 24h unnotified, generated ${new Date().toLocaleString()}`)
  sections.push('')

  let counter = 1
  if (bySeverity.critical.length > 0) {
    sections.push(`──── CRITICAL (${bySeverity.critical.length}) ────`)
    for (const e of bySeverity.critical) sections.push(fmt(e, counter++))
  }
  if (bySeverity.high.length > 0) {
    sections.push(`──── HIGH (${bySeverity.high.length}) ────`)
    for (const e of bySeverity.high) sections.push(fmt(e, counter++))
  }
  sections.push('')
  sections.push(`Please review and resolve in IT Department > System Errors.`)

  const message = sections.join('\n')
  const subject = `[Hourly Digest] ${list.length} system error(s) — ${bySeverity.critical.length} critical, ${bySeverity.high.length} high`
  const digestKey = `sys-error-digest-${new Date().toISOString().slice(0, 13)}` // hour bucket

  let sentCount = 0
  for (const recipient of RECIPIENTS) {
    try {
      const { error: sendErr } = await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'general-notification',
          recipientEmail: recipient,
          idempotencyKey: `${digestKey}-${recipient}`,
          templateData: {
            title: `System Error Digest — ${list.length} new`,
            subject,
            message,
            recipientName: recipient.split('@')[0],
          },
        },
      })
      if (!sendErr) sentCount++
    } catch (err) {
      console.error('Send failed for', recipient, err)
    }
  }

  // Mark all included errors as notified
  const ids = list.map((e) => e.id)
  for (const e of list) {
    const newMeta = { ...(e.metadata || {}), notified_at: nowIso, notified_to: RECIPIENTS }
    await supabase.from('system_errors').update({ metadata: newMeta }).eq('id', e.id)
  }

  return new Response(JSON.stringify({ ok: true, errors: list.length, emails_sent: sentCount, ids }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
