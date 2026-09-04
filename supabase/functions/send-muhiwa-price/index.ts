import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

// One-off: send today's Great Agro Coffee prices to supplier Muhiwa.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  let body: Record<string, unknown> = {}
  try { body = await req.json() } catch { /* no body */ }

  const phone = typeof body.phone === 'string' ? body.phone : '0781309165'
  const name = typeof body.name === 'string' ? body.name : 'Muhiwa'
  const message = typeof body.message === 'string'
    ? body.message
    : `Great Agro Coffee Prices 04/09/2026\nArabica: UGX 14,600/kg (80%)\nRobusta: UGX 11,300/kg (80%)\nSorted: UGX 15,800/kg\nDeliver your coffee now!`

  const res = await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceKey}` },
    body: JSON.stringify({
      phone,
      userName: name,
      message,
      messageType: 'price_update',
      triggeredBy: 'admin-manual',
    }),
  })
  const text = await res.text()

  return new Response(JSON.stringify({ ok: res.ok, status: res.status, response: text.slice(0, 1000) }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
