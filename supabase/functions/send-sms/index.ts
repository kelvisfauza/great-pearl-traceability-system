import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Buffer polyfill for Deno
function bufferFrom(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

function bufferToBase64(buffer: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < buffer.length; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary);
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
    
    const apiToken = Deno.env.get('YEDA_SMS_API_KEY') // This is your BulkSMS token
    if (!apiToken) {
      console.error('YEDA_SMS_API_KEY (BulkSMS token) not configured')
      return new Response(
        JSON.stringify({ error: 'SMS service not configured' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Send SMS using BulkSMS.com API (official format)
    try {
      console.log('Sending SMS via BulkSMS.com API...')
      
      // Try both possible token formats based on BulkSMS documentation
      const authAttempts = [
        // Attempt 1: Treat full token as username with empty password
        { username: apiToken, password: '' },
        // Attempt 2: Split token by dash (if it contains username:password)
        ...(apiToken.includes('-') ? [
          { 
            username: apiToken.split('-')[0], 
            password: apiToken.split('-').slice(1).join('-') 
          }
        ] : [])
      ];

      for (let i = 0; i < authAttempts.length; i++) {
        const { username, password } = authAttempts[i];
        console.log(`Trying auth method ${i + 1}: username=${username.substring(0, 8)}...`);
        
        // Create Basic Auth header using BulkSMS format
        const authString = bufferToBase64(bufferFrom(`${username}:${password}`));
        
        const postData = JSON.stringify({
          'to': [formattedPhone], // BulkSMS expects an array
          'body': message
        });

        const smsResponse = await fetch('https://api.bulksms.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${authString}`,
            'Accept': 'application/json'
          },
          body: postData
        });

        console.log(`Auth method ${i + 1} response status:`, smsResponse.status);

        if (smsResponse.ok) {
          const smsResult = await smsResponse.json();
          console.log('SMS sent successfully via BulkSMS:', smsResult);

          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'SMS sent successfully',
              phone: formattedPhone,
              provider: 'BulkSMS',
              authMethod: i + 1,
              details: smsResult
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        } else {
          const errorText = await smsResponse.text();
          console.error(`Auth method ${i + 1} error:`, errorText);
          
          // If it's the last method, return the error
          if (i === authAttempts.length - 1) {
            return new Response(
              JSON.stringify({ 
                error: 'Authentication failed with all methods', 
                details: errorText,
                phone: formattedPhone,
                tokenFormat: `${apiToken.substring(0, 8)}...`
              }),
              { 
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            );
          }
        }
      }

    } catch (error) {
      console.error('BulkSMS request failed:', error)
      
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