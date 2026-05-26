import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data: employees, error } = await supabase
    .from('employees')
    .select('id, name, email, disabled')
    .eq('status', 'Active')
    .not('email', 'is', null)

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const recipients = (employees || []).filter(
    (e: any) => e.email && e.email.trim() && !e.disabled,
  )

  const results: any[] = []
  for (const emp of recipients) {
    try {
      const firstName = (emp.name || '').split(/\s+/)[0] || 'Team'
      const { error: sendErr } = await supabase.functions.invoke(
        'send-transactional-email',
        {
          body: {
            templateName: 'public-holiday-closure',
            recipientEmail: emp.email,
            idempotencyKey: `holiday-closure-2026-05-27-${emp.id}`,
            templateData: { name: firstName },
          },
        },
      )
      results.push({ email: emp.email, ok: !sendErr, error: sendErr?.message })
    } catch (e: any) {
      results.push({ email: emp.email, ok: false, error: e.message })
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      sent: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      results,
    }),
    { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
  )
})