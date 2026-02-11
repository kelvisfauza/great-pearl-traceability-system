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

  // --- Authentication check ---
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'Authentication required' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  })

  const token = authHeader.replace('Bearer ', '')
  const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token)
  if (claimsError || !claimsData?.claims) {
    return new Response(
      JSON.stringify({ error: 'Invalid authentication' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const userId = claimsData.claims.sub
  console.log('WhatsApp request from user:', userId)

  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || supabaseAnonKey
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const { phone, message, userName, messageType, templateName, placeholders, department, recipientEmail, requestId, triggeredBy } = await req.json()
    
    console.log('WhatsApp request:', { phone, userName, messageType, templateName })
    
    if (!phone) {
      return new Response(
        JSON.stringify({ error: 'Phone number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const infobipApiKey = Deno.env.get('INFOBIP_API_KEY')
    const infobipBaseUrl = Deno.env.get('INFOBIP_BASE_URL')
    
    if (!infobipApiKey || !infobipBaseUrl) {
      console.error('Infobip credentials not configured')
      return new Response(
        JSON.stringify({ error: 'WhatsApp service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Format phone number - remove + for Infobip (they expect digits only)
    let formattedPhone = phone.toString().trim()
    if (!formattedPhone.startsWith('+')) {
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '256' + formattedPhone.substring(1)
      } else if (!formattedPhone.startsWith('256')) {
        formattedPhone = '256' + formattedPhone
      }
    } else {
      formattedPhone = formattedPhone.replace('+', '')
    }

    console.log('Formatted phone for WhatsApp:', formattedPhone)

    // Determine template and placeholders
    const template = templateName || 'test_whatsapp_template_en'
    const bodyPlaceholders = placeholders || [userName || 'User']

    // If a free-text message is provided and no template, send as text message
    let requestBody: any
    let endpoint: string

    if (message && !templateName) {
      // Send as free-form text message
      endpoint = `https://${infobipBaseUrl}/whatsapp/1/message/text`
      requestBody = {
        from: "447860088970",
        to: formattedPhone,
        content: {
          text: message
        }
      }
    } else {
      // Send as template message
      endpoint = `https://${infobipBaseUrl}/whatsapp/1/message/template`
      requestBody = {
        messages: [
          {
            from: "447860088970",
            to: formattedPhone,
            content: {
              templateName: template,
              templateData: {
                body: {
                  placeholders: bodyPlaceholders
                }
              },
              language: "en"
            }
          }
        ]
      }
    }

    console.log('Sending WhatsApp via Infobip:', endpoint)

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `App ${infobipApiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    const responseText = await response.text()
    console.log('Infobip response status:', response.status)
    console.log('Infobip response:', responseText)

    let result: any = {}
    try {
      result = JSON.parse(responseText)
    } catch {
      result = { raw: responseText }
    }

    // Log to sms_logs with provider=WhatsApp
    try {
      await supabase.from('sms_logs').insert({
        recipient_phone: formattedPhone,
        recipient_name: userName,
        recipient_email: recipientEmail,
        message_content: message || `WhatsApp template: ${template}`,
        message_type: messageType || 'whatsapp',
        status: response.ok ? 'sent' : 'failed',
        provider: 'WhatsApp-Infobip',
        provider_response: result,
        credits_used: 1,
        department: department,
        triggered_by: triggeredBy || userId,
        request_id: requestId,
        failure_reason: response.ok ? null : responseText
      })
    } catch (dbError) {
      console.error('Failed to log WhatsApp to database:', dbError)
    }

    if (response.ok) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'WhatsApp message sent successfully',
          phone: formattedPhone,
          provider: 'WhatsApp-Infobip',
          details: result
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      return new Response(
        JSON.stringify({ 
          error: 'Failed to send WhatsApp message',
          details: result,
          phone: formattedPhone
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('Error in send-whatsapp function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
