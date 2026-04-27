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

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabaseServiceKey = serviceRoleKey || supabaseAnonKey
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Check if this is a queue processing request (no auth needed, uses service role internally)
  let rawBody = ''
  try { rawBody = await req.text() } catch {}
  let parsedBody: any = {}
  try { parsedBody = JSON.parse(rawBody) } catch {}
  
  if (parsedBody.action === 'process_queue') {
    console.log('Processing SMS queue...')
    try {
      const { data: pendingMessages, error: fetchError } = await supabase
        .from('sms_notification_queue')
        .select('*')
        .eq('status', 'pending')
        .limit(20)

      if (fetchError) {
        console.error('Failed to fetch queue:', fetchError)
        return new Response(JSON.stringify({ error: 'Failed to fetch queue' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      if (!pendingMessages || pendingMessages.length === 0) {
        return new Response(JSON.stringify({ success: true, processed: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const results = []
      for (const msg of pendingMessages) {
        try {
          // Format phone
          let formattedPhone = msg.recipient_phone.toString().trim()
          if (!formattedPhone.startsWith('+')) {
            if (formattedPhone.startsWith('0')) formattedPhone = '+256' + formattedPhone.substring(1)
            else if (formattedPhone.startsWith('256')) formattedPhone = '+' + formattedPhone
            else formattedPhone = '+256' + formattedPhone
          }

          const apiKey = Deno.env.get('YOOLA_SMS_API_KEY')
          if (!apiKey) { results.push({ id: msg.id, success: false, error: 'No API key' }); continue; }

          const smsResponse = await fetch('https://yoolasms.com/api/v1/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: formattedPhone, message: msg.message, api_key: apiKey })
          })

          const success = smsResponse.ok
          console.log(`Queue SMS to ${formattedPhone}: ${success ? 'sent' : 'failed'} (${smsResponse.status})`)

          await supabase.from('sms_notification_queue').update({
            status: success ? 'sent' : 'failed',
            sent_at: success ? new Date().toISOString() : null,
            error_message: success ? null : `HTTP ${smsResponse.status}`
          }).eq('id', msg.id)

          // If YoolaSMS failed, try Infobip fallback
          if (!success) {
            const infobipResult = await sendInfobipSmsFallback(formattedPhone, msg.message, supabase, {
              userName: 'Employee', recipientEmail: msg.recipient_email, messageType: msg.notification_type
            })
            if (infobipResult.success) {
              await supabase.from('sms_notification_queue').update({ status: 'sent', sent_at: new Date().toISOString(), error_message: 'Sent via Infobip fallback' }).eq('id', msg.id)
            }
          }

          results.push({ id: msg.id, success })
        } catch (err) {
          console.error(`Failed to process queue item ${msg.id}:`, err.message)
          await supabase.from('sms_notification_queue').update({ status: 'failed', error_message: err.message }).eq('id', msg.id)
          results.push({ id: msg.id, success: false, error: err.message })
        }
      }

      return new Response(JSON.stringify({ success: true, processed: results.length, results }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    } catch (err) {
      console.error('Queue processing error:', err.message)
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
  }

  // --- Authentication check for direct SMS sending ---
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'Authentication required' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Allow service-role key calls (from other edge functions / cron jobs)
  const token = authHeader.replace('Bearer ', '')
  const isServiceRole = token === serviceRoleKey

  let userId = 'system'
  if (!isServiceRole) {
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser()
    if (userError || !user) {
      console.error('Auth validation failed:', userError?.message)
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    userId = user.id
  }
  console.log('Authenticated:', isServiceRole ? 'service-role' : userId)

  try {
    const { phone, message, userName, messageType, triggeredBy, requestId, department, recipientEmail } = parsedBody
    
    console.log('📱 SMS request from user:', userId, '| type:', messageType)
    console.log('Received SMS request:', { phone, userName, messageLength: message?.length })

    // SMS GATEKEEPER: Only allow OTP/verification and account creation SMS through
    // All other notifications should use email instead to save SMS credits
    const ALLOWED_SMS_TYPES = [
      'verification',
      'otp',
      'login_code',
      'twofa',
      'account_creation',
      'bypass_sms',
      'loan_reminder',
      'loan_guarantor_request',
      'price_update',
      'supplier_price_broadcast',
      'payout_confirmation',
    ]
    
    const isAllowedType = ALLOWED_SMS_TYPES.includes(messageType?.toLowerCase() || '')
    const isOtpMessage = message && (
      /\bcode\b.*\d{4,6}/i.test(message) || 
      /\d{4,6}.*\bcode\b/i.test(message) ||
      /verification\s*code/i.test(message) ||
      /login\s*code/i.test(message) ||
      /Temporary Password/i.test(message)
    )
    
    if (!isAllowedType && !isOtpMessage) {
      console.log(`🚫 SMS BLOCKED (non-OTP type: ${messageType}). Use email instead. Recipient: ${userName || recipientEmail || phone}`)
      
      // Log as redirected but return success so callers don't break
      try {
        await supabase.from('sms_logs').insert({
          recipient_phone: phone,
          recipient_name: userName,
          recipient_email: recipientEmail,
          message_content: message?.substring(0, 50) + '... [blocked - use email]',
          message_type: messageType || 'general',
          status: 'redirected_to_email',
          provider: 'BLOCKED',
          credits_used: 0,
          department: department,
          triggered_by: triggeredBy,
          request_id: requestId,
        })
      } catch (logErr) {
        console.error('Failed to log blocked SMS:', logErr)
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          blocked: true, 
          reason: 'Non-OTP SMS blocked to save credits. Use email for this notification type.',
          messageType 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    console.log(`✅ SMS ALLOWED (type: ${messageType}, isOtp: ${isOtpMessage})`)
    
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

          // Create in-app notification for the recipient
          try {
            if (recipientEmail) {
              const { data: targetEmp } = await supabase
                .from('employees')
                .select('id, department')
                .eq('email', recipientEmail)
                .eq('status', 'Active')
                .maybeSingle();

              if (targetEmp) {
                const notifTitle = messageType === 'monthly_allowance' ? 'Allowance Credited'
                  : messageType === 'salary' ? 'Salary Credited'
                  : messageType === 'bonus' ? 'Bonus Received'
                  : messageType === 'withdrawal' ? 'Withdrawal Update'
                  : messageType === 'loan' ? 'Loan Update'
                  : 'System Message';

                await supabase.from('notifications').insert({
                  type: 'system',
                  title: notifTitle,
                  message: message,
                  priority: 'medium',
                  target_user_id: targetEmp.id,
                  target_department: targetEmp.department,
                  is_read: false
                });
                console.log('In-app notification created for', recipientEmail);
              }
            }
          } catch (notifErr) {
            console.error('Failed to create in-app notification:', notifErr);
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
        console.error(`YoolaSMS request failed (attempt ${attempt}/${maxRetries}):`, (error as Error).message);
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
