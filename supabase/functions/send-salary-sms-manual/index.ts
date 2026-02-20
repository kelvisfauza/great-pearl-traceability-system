import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const { phone, message, userName } = await req.json()

    if (!phone || !message) {
      return new Response(
        JSON.stringify({ error: 'Phone and message required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let formattedPhone = phone.toString().trim()
    if (!formattedPhone.startsWith('+')) {
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '+256' + formattedPhone.substring(1)
      } else if (formattedPhone.startsWith('256')) {
        formattedPhone = '+' + formattedPhone
      } else {
        formattedPhone = '+256' + formattedPhone
      }
    }

    const apiKey = Deno.env.get('YOOLA_SMS_API_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'SMS service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Sending salary SMS to:', formattedPhone)

    const smsResponse = await fetch('https://yoolasms.com/api/v1/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: formattedPhone, message, api_key: apiKey })
    })

    const responseText = await smsResponse.text()
    console.log('YoolaSMS response:', smsResponse.status, responseText)

    let smsResult: any = {}
    try { smsResult = JSON.parse(responseText) } catch { smsResult = { raw: responseText } }

    // Log to sms_logs
    await supabase.from('sms_logs').insert({
      recipient_phone: formattedPhone,
      recipient_name: userName || 'Unknown',
      message_content: message,
      message_type: 'salary_dispersal',
      status: smsResponse.ok ? 'sent' : 'failed',
      provider: 'YoolaSMS',
      provider_response: smsResult,
      credits_used: 1,
      department: 'HR',
      triggered_by: 'Manual Admin Send'
    })

    if (smsResponse.ok) {
      return new Response(
        JSON.stringify({ success: true, phone: formattedPhone, details: smsResult }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fallback to Infobip
    const infobipApiKey = Deno.env.get('INFOBIP_API_KEY')
    if (infobipApiKey) {
      const infobipRes = await fetch('https://api.infobip.com/sms/2/text/advanced', {
        method: 'POST',
        headers: {
          'Authorization': `App ${infobipApiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          messages: [{ destinations: [{ to: formattedPhone.replace('+', '') }], from: "447491163443", text: message }]
        })
      })
      const infobipText = await infobipRes.text()
      console.log('Infobip fallback:', infobipRes.status, infobipText)

      if (infobipRes.ok) {
        return new Response(
          JSON.stringify({ success: true, provider: 'Infobip', phone: formattedPhone }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    return new Response(
      JSON.stringify({ error: 'All SMS providers failed', details: responseText }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
