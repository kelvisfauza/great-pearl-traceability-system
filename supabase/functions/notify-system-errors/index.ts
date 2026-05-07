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
    .limit(50)

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

  // Send one email per error
  let sentCount = 0
  const nowIso = new Date().toISOString()

  for (const e of errors as any[]) {
    const sev = (e.severity || '').toUpperCase()
    const message = `A new ${sev} system error was detected:\n\n` +
      `Title: ${e.title}\n` +
      `Description: ${e.description || 'n/a'}\n` +
      `Type: ${e.error_type || 'n/a'}\n` +
      `Component: ${e.component || 'n/a'}\n` +
      `Affected User: ${e.user_email || 'n/a'}\n` +
      `URL: ${e.url || 'n/a'}\n` +
      `Time: ${new Date(e.created_at).toLocaleString()}\n\n` +
      `Please review and resolve this in IT Department > System Errors.`

    for (const recipient of RECIPIENTS) {
      try {
        const { error: sendErr } = await supabase.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'general-notification',
            recipientEmail: recipient,
            idempotencyKey: `sys-error-${e.id}-${recipient}`,
            templateData: {
              title: `[${sev}] ${e.title}`,
              subject: `[${sev}] System Error: ${e.title} - Great Agro Coffee`,
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

    const newMeta = { ...(e.metadata || {}), notified_at: nowIso, notified_to: RECIPIENTS }
    await supabase.from('system_errors').update({ metadata: newMeta }).eq('id', e.id)
  }

  return new Response(JSON.stringify({ ok: true, errors: errors.length, emails_sent: sentCount }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
