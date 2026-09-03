import { createClient } from 'npm:@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ ok: false, error: 'Supabase not configured' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  const { data: employees, error } = await supabase
    .from('employees')
    .select('name, email, status, disabled')
    .eq('status', 'Active')

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const recipients = (employees || [])
    .filter((e: any) => e.email && e.disabled !== true && !/@placeholder|noemail|no-reply/i.test(e.email))
    .map((e: any) => ({ name: e.name as string, email: (e.email as string).trim() }))

  const seen = new Set<string>()
  const unique = recipients.filter((r) => {
    const k = r.email.toLowerCase()
    if (seen.has(k)) return false
    seen.add(k); return true
  })

  const stamp = Date.now()
  const results: Array<{ email: string; status: string }> = []

  const message = [
    'Following concerns raised by staff regarding the 9:30 PM exit time and the difficulty of finding supper thereafter, management has reviewed and revised the factory exit time.',
    '',
    'Item | Previous | Effective Now',
    'Factory exit (Monday - Saturday) | 9:30 PM | 8:30 PM',
    'Sunday working hours | 9:00 AM - 4:00 PM | Unchanged',
    '',
    'What this means:',
    '• All departments must wind up operations and leave the factory by 8:30 PM, Monday to Saturday.',
    '• Sunday remains a working day from 9:00 AM to 4:00 PM for all departments.',
    '• Per diem entitlements continue to apply as before.',
    '• Undertime rules remain in force — early departure before the official closing time will still attract undertime.',
    '',
    'Supervisors and heads of department should plan daily workloads so that all activities are completed within the revised time.',
    '',
    'Thank you for your continued commitment.',
  ].join('\n')

  for (const r of unique) {
    try {
      const idem = `exit-time-830-v1-${stamp}-${r.email.toLowerCase()}`
      const { error: invokeError } = await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'general-notification',
          recipientEmail: r.email,
          idempotencyKey: idem,
          templateData: {
            subject: 'Revised Factory Exit Time — Now 8:30 PM',
            title: 'Revised Factory Exit Time — Now 8:30 PM',
            recipientName: r.name,
            message,
          },
        },
      })
      if (invokeError) throw invokeError
      results.push({ email: r.email, status: 'sent' })
    } catch (err: any) {
      results.push({ email: r.email, status: `failed: ${err.message || String(err)}` })
    }
  }

  const sent = results.filter((r) => r.status === 'sent').length
  return new Response(JSON.stringify({ ok: true, total: results.length, sent, failed: results.length - sent, results }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})
