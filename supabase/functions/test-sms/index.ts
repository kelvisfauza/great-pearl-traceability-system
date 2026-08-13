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
    const { phone, provider, message, sender } = await req.json()
    
    const testPhone = phone || '+256700729340'
    const testMessage = message || 'TEST SMS: This is a test message from Great Agro Coffee system. If you receive this, SMS service is working.'

    // Optional: force delivery via BulkSMS.com
    if (provider === 'bulksms') {
      const tokenId = Deno.env.get('BULKSMS_TOKEN_ID')
      const tokenSecret = Deno.env.get('BULKSMS_TOKEN_SECRET')
      if (!tokenId || !tokenSecret) {
        return new Response(
          JSON.stringify({ error: 'BulkSMS credentials not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      const auth = btoa(`${tokenId}:${tokenSecret}`)
      const from = sender || 'Great Agro'
      const bulkRes = await fetch('https://api.bulksms.com/v1/messages', {
        method: 'POST',
        headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testPhone, from, body: testMessage, encoding: 'TEXT' }),
      })
      const bulkText = await bulkRes.text()
      console.log('BulkSMS response:', bulkRes.status, bulkText)
      return new Response(
        JSON.stringify({ success: bulkRes.ok, provider: 'BulkSMS.com', sender: from, status: bulkRes.status, phone: testPhone, response: bulkText }),
        { status: bulkRes.ok ? 200 : 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
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
        details: (error as Error).message
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})