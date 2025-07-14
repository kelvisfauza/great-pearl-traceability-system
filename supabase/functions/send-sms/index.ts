
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
    const { phone, code } = await req.json()
    
    if (!phone || !code) {
      return new Response(
        JSON.stringify({ error: 'Phone number and code are required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Format phone number (remove + if present)
    const formattedPhone = phone.replace(/^\+/, '')
    
    const message = `Your Great Pearl Coffee verification code is: ${code}. This code expires in 5 minutes.`
    
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

    const smsResult = await smsResponse.json()
    
    if (!smsResponse.ok) {
      console.error('SMS sending failed:', smsResult)
      return new Response(
        JSON.stringify({ error: 'Failed to send SMS', details: smsResult }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('SMS sent successfully:', smsResult)

    return new Response(
      JSON.stringify({ success: true, message: 'SMS sent successfully' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in send-sms function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
