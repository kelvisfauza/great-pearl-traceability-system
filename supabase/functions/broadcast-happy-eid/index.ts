import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data: employees, error } = await supabase
    .from('employees')
    .select('id, name, email, disabled, status')
    .eq('status', 'Active')
    .not('email', 'is', null)

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const recipients = (employees ?? []).filter(
    (e: any) => !e.disabled && e.email && /@/.test(e.email),
  )

  let sent = 0
  let failed = 0
  const errors: any[] = []

  for (const emp of recipients) {
    try {
      const { error: sendErr } = await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'happy-eid',
          to: emp.email,
          data: { name: emp.name?.split(' ')[0] || 'Team' },
          idempotencyKey: `happy-eid-2026-${emp.id}`,
        },
      })
      if (sendErr) { failed++; errors.push({ email: emp.email, error: sendErr.message }) }
      else sent++
    } catch (e: any) {
      failed++
      errors.push({ email: emp.email, error: e.message })
    }
  }

  return new Response(
    JSON.stringify({ ok: true, total: recipients.length, sent, failed, errors }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})