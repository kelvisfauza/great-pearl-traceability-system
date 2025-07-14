
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
    const { phone, code, userName } = await req.json()
    
    console.log('Received request:', { phone, code, userName })
    
    if (!phone || !code) {
      console.error('Missing required fields:', { phone: !!phone, code: !!code })
      return new Response(
        JSON.stringify({ error: 'Phone number and code are required' }),
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
    
    // Personalize the message with user's name if available
    const greeting = userName ? `Dear ${userName},` : 'Dear User,'
    const message = `Great Pearl Coffee Factory - ${greeting} Please use code ${code} for logging in. This code expires in 5 minutes.`
    
    console.log('Sending SMS to:', formattedPhone, 'Message:', message)
    
    // Send SMS using the provided API
    const smsResponse = await fetch('https://api.sms.net/sms/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer xgpYr222zWMD4w5VIzUaZc5KYO5L1w8N38qBj1qPflwguq9PdJ545NTCSLTS7H00`
      },
      body: JSON.stringify({
        to: formattedPhone,
        message: message,
        from: 'GreatPearl'
      })
    })

    console.log('SMS API response status:', smsResponse.status)

    if (!smsResponse.ok) {
      const errorText = await smsResponse.text()
      console.error('SMS API error response:', errorText)
      
      // Try to parse as JSON, fall back to text
      let smsResult
      try {
        smsResult = JSON.parse(errorText)
      } catch {
        smsResult = { error: errorText }
      }
      
      console.error('SMS sending failed:', smsResult)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to send SMS', 
          details: smsResult,
          phone: formattedPhone 
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const smsResult = await smsResponse.json()
    console.log('SMS sent successfully:', smsResult)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'SMS sent successfully',
        phone: formattedPhone 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in send-sms function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message,
        stack: error.stack 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
