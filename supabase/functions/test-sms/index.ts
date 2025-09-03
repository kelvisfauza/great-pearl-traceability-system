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
    const { phone } = await req.json()
    
    const testPhone = phone || '+256700729340'
    const testMessage = 'TEST SMS: This is a test message from Great Pearl Coffee system. If you receive this, SMS service is working.'
    
    console.log('Testing SMS to:', testPhone)
    
    const apiKey = Deno.env.get('YOOLA_SMS_API_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'SMS API key not configured' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('API Key available:', !!apiKey)

    // Test YoolaSMS API directly
    const postData = JSON.stringify({
      phone: testPhone,
      message: testMessage,
      api_key: apiKey
    });

    console.log('Sending test SMS via YoolaSMS...')
    
    const smsResponse = await fetch('https://yoolasms.com/api/v1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: postData
    });

    console.log('YoolaSMS response status:', smsResponse.status);
    const responseText = await smsResponse.text();
    console.log('YoolaSMS response body:', responseText);

    if (smsResponse.ok) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Test SMS sent successfully',
          phone: testPhone,
          response: responseText
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    } else {
      return new Response(
        JSON.stringify({ 
          error: 'SMS send failed', 
          status: smsResponse.status,
          response: responseText,
          phone: testPhone
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

  } catch (error) {
    console.error('Test SMS error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Test failed', 
        details: error.message
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})