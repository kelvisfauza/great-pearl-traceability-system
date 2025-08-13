import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { phone, message, userName } = await req.json()
    
    console.log('Received SMS request:', { phone, userName, messageLength: message?.length })
    
    if (!phone || !message) {
      console.error('Missing required fields:', { phone: !!phone, message: !!message })
      return new Response(
        JSON.stringify({ error: 'Phone number and message are required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Format phone number (ensure it has country code)
    let formattedPhone = phone.toString().trim()
    
    // If phone doesn't start with +, assume it's a Ugandan number
    if (!formattedPhone.startsWith('+')) {
      if (formattedPhone.startsWith('0')) {
        // Replace leading 0 with +256 for Uganda
        formattedPhone = '+256' + formattedPhone.substring(1)
      } else if (formattedPhone.startsWith('256')) {
        // Add + if missing
        formattedPhone = '+' + formattedPhone
      } else {
        // Assume it's a Ugandan number without country code
        formattedPhone = '+256' + formattedPhone
      }
    }
    
    console.log('Formatted phone:', formattedPhone)
    
    const apiKey = Deno.env.get('YEDA_SMS_API_KEY')
    if (!apiKey) {
      console.error('YEDA_SMS_API_KEY not configured')
      return new Response(
        JSON.stringify({ error: 'SMS service not configured' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Send SMS using Yeda SMS API
    try {
      console.log('Sending SMS via Yeda SMS API...')
      
      const smsResponse = await fetch('https://yeda.co.ug/api/sms/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          to: formattedPhone,
          message: message,
          from: 'GreatPearl'
        })
      })

      console.log('Yeda SMS response status:', smsResponse.status)

      if (smsResponse.ok) {
        const smsResult = await smsResponse.json()
        console.log('SMS sent successfully via Yeda:', smsResult)

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'SMS sent successfully',
            phone: formattedPhone,
            provider: 'Yeda SMS'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      } else {
        const errorText = await smsResponse.text()
        console.error('Yeda SMS error:', errorText)
        
        return new Response(
          JSON.stringify({ 
            error: 'Failed to send SMS', 
            details: errorText,
            phone: formattedPhone 
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    } catch (error) {
      console.error('Yeda SMS request failed:', error)
      
      return new Response(
        JSON.stringify({ 
          error: 'SMS service unavailable', 
          details: error.message,
          phone: formattedPhone 
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

  } catch (error) {
    console.error('Error in send-sms function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})