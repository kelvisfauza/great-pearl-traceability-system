import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Initialize Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://pudfybkyfedeggmokhco.supabase.co'
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1ZGZ5Ymt5ZmVkZWdnbW9raGNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNDAxNjEsImV4cCI6MjA2NzkxNjE2MX0.RSK-BwEjyRMn9YM998_93-W9g8obmjnLXgOgTrIAZJk'
  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    const { phone, message, userName, messageType, triggeredBy, requestId, department, recipientEmail } = await req.json()
    
    console.log('📱 FULL SMS MESSAGE CONTENT:', message)
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

    // Send SMS using YoolaSMS API
    try {
      console.log('Sending SMS via YoolaSMS API...')
      
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
        const smsResult = await smsResponse.json();
        console.log('SMS sent successfully via YoolaSMS:', smsResult);

        // Log successful SMS to database
        await supabase.from('sms_logs').insert({
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
          triggered_by: triggeredBy,
          request_id: requestId
        });

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
        
        // Log failed SMS to database
        await supabase.from('sms_logs').insert({
          recipient_phone: formattedPhone,
          recipient_name: userName,
          recipient_email: recipientEmail,
          message_content: message,
          message_type: messageType || 'general',
          status: 'failed',
          provider: 'YoolaSMS',
          failure_reason: errorText,
          department: department,
          triggered_by: triggeredBy,
          request_id: requestId
        });
        
        return new Response(
          JSON.stringify({ 
            error: 'Failed to send SMS', 
            details: errorText,
            phone: formattedPhone,
            provider: 'YoolaSMS'
          }),
          { 
            status: smsResponse.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

    } catch (error) {
      console.error('YoolaSMS request failed:', error)
      
      // Log failed SMS to database
      await supabase.from('sms_logs').insert({
        recipient_phone: formattedPhone,
        recipient_name: userName,
        recipient_email: recipientEmail,
        message_content: message,
        message_type: messageType || 'general',
        status: 'failed',
        provider: 'YoolaSMS',
        failure_reason: error.message,
        department: department,
        triggered_by: triggeredBy,
        request_id: requestId
      });
      
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