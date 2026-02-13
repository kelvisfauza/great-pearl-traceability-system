import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

async function sendInfobipSmsFallback(phone: string, message: string, supabase: any, meta: any) {
  try {
    const infobipApiKey = Deno.env.get('INFOBIP_API_KEY');
    if (!infobipApiKey) {
      console.error('INFOBIP_API_KEY not configured for SMS fallback');
      return { success: false };
    }

    const response = await fetch('https://api.infobip.com/sms/2/text/advanced', {
      method: 'POST',
      headers: {
        'Authorization': `App ${infobipApiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        messages: [{
          destinations: [{ to: phone.replace('+', '') }],
          from: "447491163443",
          text: message
        }]
      })
    });

    const responseText = await response.text();
    console.log('Infobip SMS fallback response:', response.status, responseText);

    let result: any = {};
    try { result = JSON.parse(responseText); } catch { result = { raw: responseText }; }

    // Log to sms_logs
    try {
      await supabase.from('sms_logs').insert({
        recipient_phone: phone,
        recipient_name: meta.userName,
        recipient_email: meta.recipientEmail,
        message_content: message,
        message_type: meta.messageType || 'general',
        status: response.ok ? 'sent' : 'failed',
        provider: 'Infobip-SMS-Fallback',
        provider_response: result,
        credits_used: 1,
        department: meta.department,
        triggered_by: meta.triggeredBy,
        request_id: meta.requestId,
        failure_reason: response.ok ? null : responseText
      });
    } catch (dbErr) {
      console.error('Failed to log Infobip fallback SMS:', dbErr);
    }

    return { success: response.ok, details: result };
  } catch (err) {
    console.error('Infobip SMS fallback error:', err.message);
    return { success: false };
  }
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
    console.error('Auth validation failed:', claimsError?.message)
    return new Response(
      JSON.stringify({ error: 'Invalid authentication' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const userId = claimsData.claims.sub
  console.log('Authenticated user:', userId)

  // Use service role for DB operations
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || supabaseAnonKey
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const { phone, message, userName, messageType, triggeredBy, requestId, department, recipientEmail } = await req.json()
    
    console.log('📱 SMS request from user:', userId, '| type:', messageType)
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
    
    if (!formattedPhone.startsWith('+')) {
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '+256' + formattedPhone.substring(1)
      } else if (formattedPhone.startsWith('256')) {
        formattedPhone = '+' + formattedPhone
      } else {
        formattedPhone = '+256' + formattedPhone
      }
    }
    
    console.log('Formatted phone:', formattedPhone)
    
    const apiKey = Deno.env.get('YOOLA_SMS_API_KEY')
    if (!apiKey) {
      console.error('YOOLA_SMS_API_KEY not configured')
      return new Response(
        JSON.stringify({ error: 'SMS service not configured' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Send SMS using YoolaSMS API with retry logic
    const maxRetries = 3;
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Sending SMS via YoolaSMS API... (attempt ${attempt}/${maxRetries})`);
        
        const postData = JSON.stringify({
          phone: formattedPhone,
          message: message,
          api_key: apiKey
        });

        const smsResponse = await fetch('https://yoolasms.com/api/v1/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: postData
        });

        console.log('YoolaSMS response status:', smsResponse.status);

        if (smsResponse.ok) {
          let smsResult;
          try {
            const responseText = await smsResponse.text();
            console.log('YoolaSMS raw response:', responseText);
            
            if (responseText.trim()) {
              smsResult = JSON.parse(responseText);
            } else {
              smsResult = { 
                message: 'SMS sent successfully (empty response)', 
                status: 'success',
                code: 200,
                recipients: 1,
                credits_used: 1 
              };
            }
          } catch (jsonError) {
            console.warn('Failed to parse YoolaSMS response as JSON:', jsonError);
            smsResult = { 
              message: 'SMS sent successfully (unparseable response)', 
              status: 'success',
              code: 200,
              recipients: 1,
              credits_used: 1 
            };
          }
          
          console.log('SMS sent successfully via YoolaSMS:', smsResult);

          // Log successful SMS to database
          try {
            const logResult = await supabase.from('sms_logs').insert({
              recipient_phone: formattedPhone,
              recipient_name: userName,
              recipient_email: recipientEmail,
              message_content: message,
              message_type: messageType || 'general',
              status: 'sent',
              provider: 'YoolaSMS',
              provider_response: smsResult,
              credits_used: smsResult.credits_used || 1,
              department: department,
              triggered_by: triggeredBy || userId,
              request_id: requestId
            });
            
            if (logResult.error) {
              console.error('Database logging error:', logResult.error);
            }
          } catch (dbError) {
            console.error('Failed to log SMS to database:', dbError);
          }

          // WhatsApp removed - now handled separately via send-whatsapp function

          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'SMS sent successfully',
              phone: formattedPhone,
              provider: 'YoolaSMS',
              details: smsResult
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        } else {
          const errorText = await smsResponse.text();
          console.error('YoolaSMS API error:', errorText);
          console.log('Attempting Infobip SMS fallback...');
          
          // Fallback to Infobip SMS
          const infobipResult = await sendInfobipSmsFallback(formattedPhone, message, supabase, {
            userName, recipientEmail, messageType, department, triggeredBy: triggeredBy || userId, requestId
          });
          
          if (infobipResult.success) {
            return new Response(
              JSON.stringify({ 
                success: true, 
                message: 'SMS sent via fallback (Infobip)',
                phone: formattedPhone,
                provider: 'Infobip-SMS',
                details: infobipResult.details,
                fallback: true
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          // Both providers failed
          try {
            await supabase.from('sms_logs').insert({
              recipient_phone: formattedPhone,
              recipient_name: userName,
              recipient_email: recipientEmail,
              message_content: message,
              message_type: messageType || 'general',
              status: 'failed',
              provider: 'YoolaSMS',
              failure_reason: `YoolaSMS: ${errorText} | Infobip fallback also failed`,
              department: department,
              triggered_by: triggeredBy || userId,
              request_id: requestId
            });
          } catch (dbError) {
            console.error('Failed to log failed SMS:', dbError);
          }
          
          return new Response(
            JSON.stringify({ 
              error: 'Failed to send SMS via both providers', 
              details: errorText,
              phone: formattedPhone
            }),
            { 
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

      } catch (error) {
        console.error(`YoolaSMS request failed (attempt ${attempt}/${maxRetries}):`, error.message);
        lastError = error;
        
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
    }
    
    // All YoolaSMS retries failed - try Infobip SMS fallback
    console.error('All YoolaSMS retry attempts failed:', lastError?.message);
    console.log('Attempting Infobip SMS fallback...');
    
    const infobipResult = await sendInfobipSmsFallback(formattedPhone, message, supabase, {
      userName, recipientEmail, messageType, department, triggeredBy: triggeredBy || userId, requestId
    });
    
    if (infobipResult.success) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'SMS sent via fallback (Infobip)',
          phone: formattedPhone,
          provider: 'Infobip-SMS',
          details: infobipResult.details,
          fallback: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ 
        error: 'SMS failed via both YoolaSMS and Infobip', 
        details: lastError?.message || 'All providers failed',
        phone: formattedPhone
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in send-sms function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
