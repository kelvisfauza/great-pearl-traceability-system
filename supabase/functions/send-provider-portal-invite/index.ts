import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey)

    const link = 'https://greatpearlcoffeesystem.site/submit-request'
    const message =
      `Great Pearl Coffee: You can now submit your own payment or meal-plan request. Fill the form (name, phone, amount, details) here: ${link} . After admin approval, payment is sent to your number automatically.`

    // 1. Registered service providers
    const { data: providers } = await supabase
      .from('service_providers')
      .select('phone, alternative_phone, name')

    // 2. Past meal disbursement recipients (distinct phones)
    const { data: meals } = await supabase
      .from('meal_disbursements')
      .select('receiver_phone, receiver_name')

    const phones = new Set<string>()
    const addPhone = (p?: string | null) => {
      if (!p) return
      const t = String(p).trim()
      if (t) phones.add(t)
    }
    providers?.forEach((p: any) => { addPhone(p.phone); addPhone(p.alternative_phone) })
    meals?.forEach((m: any) => addPhone(m.receiver_phone))

    const allPhones = Array.from(phones)
    console.log(`Sending provider portal invite to ${allPhones.length} recipients`)

    let sent = 0, failed = 0
    const errors: any[] = []
    for (let i = 0; i < allPhones.length; i++) {
      if (i > 0) await new Promise(r => setTimeout(r, 400))
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            phone: allPhones[i],
            message,
            messageType: 'service_provider_invite',
            triggeredBy: 'provider_portal_announcement',
          }),
        })
        if (res.ok) sent++
        else { failed++; errors.push({ phone: allPhones[i], err: await res.text() }) }
      } catch (e: any) {
        failed++; errors.push({ phone: allPhones[i], err: e.message })
      }
    }

    return new Response(JSON.stringify({
      success: true,
      total: allPhones.length,
      sent,
      failed,
      breakdown: {
        service_providers: providers?.length || 0,
        meal_recipients: meals?.length || 0,
      },
      sample_errors: errors.slice(0, 5),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e: any) {
    console.error('send-provider-portal-invite error:', e)
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})