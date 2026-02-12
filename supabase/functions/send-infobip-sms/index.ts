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

  // --- Optional Authentication ---
  const authHeader = req.headers.get('Authorization')
  let userId = 'anonymous'

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

  if (authHeader?.startsWith('Bearer ')) {
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })
    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData } = await supabaseAuth.auth.getClaims(token)
    if (claimsData?.claims) {
      userId = claimsData.claims.sub as string
    }
  }

  console.log('Infobip SMS request from user:', userId)

  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || supabaseAnonKey
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const { phone, message, userName, messageType, department, recipientEmail, requestId, triggeredBy } = await req.json()

    if (!phone || !message) {
      return new Response(
        JSON.stringify({ error: 'Phone number and message are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const infobipApiKey = Deno.env.get('INFOBIP_API_KEY')
    if (!infobipApiKey) {
      return new Response(
        JSON.stringify({ error: 'Infobip API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Format phone number - digits only for Infobip
    let formattedPhone = phone.toString().trim()
    if (formattedPhone.startsWith('+')) {
      formattedPhone = formattedPhone.replace('+', '')
    } else if (formattedPhone.startsWith('0')) {
      formattedPhone = '256' + formattedPhone.substring(1)
    } else if (!formattedPhone.startsWith('256')) {
      formattedPhone = '256' + formattedPhone
    }

    console.log('Sending Infobip SMS to:', formattedPhone)

    const response = await fetch('https://api.infobip.com/sms/2/text/advanced', {
      method: 'POST',
      headers: {
        'Authorization': `App ${infobipApiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        messages: [{
          destinations: [{ to: formattedPhone }],
          from: "447491163443",
          text: message
        }]
      })
    })

    const responseText = await response.text()
    console.log('Infobip SMS response:', response.status, responseText)

    let result: any = {}
    try { result = JSON.parse(responseText) } catch { result = { raw: responseText } }

    // Log to sms_logs
    try {
      await supabase.from('sms_logs').insert({
        recipient_phone: formattedPhone,
        recipient_name: userName,
        recipient_email: recipientEmail,
        message_content: message,
        message_type: messageType || 'infobip_sms',
        status: response.ok ? 'sent' : 'failed',
        provider: 'Infobip-SMS',
        provider_response: result,
        credits_used: 1,
        department: department,
        triggered_by: triggeredBy || userId,
        request_id: requestId,
        failure_reason: response.ok ? null : responseText
      })
    } catch (dbError) {
      console.error('Failed to log SMS:', dbError)
    }

    if (response.ok) {
      return new Response(
        JSON.stringify({ success: true, message: 'SMS sent successfully', phone: formattedPhone, provider: 'Infobip-SMS', details: result }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      return new Response(
        JSON.stringify({ error: 'Failed to send SMS', details: result, phone: formattedPhone }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('Error in send-infobip-sms:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
