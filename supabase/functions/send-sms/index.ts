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

async function sendBulkSmsPremium(phone: string, message: string, supabase: any, meta: any) {
  try {
    const tokenId = Deno.env.get('BULKSMS_TOKEN_ID');
    const tokenSecret = Deno.env.get('BULKSMS_TOKEN_SECRET');
    if (!tokenId || !tokenSecret) {
      console.error('BulkSMS credentials not configured');
      return { success: false };
    }

    const auth = btoa(`${tokenId}:${tokenSecret}`);
    const response = await fetch('https://api.bulksms.com/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: phone,
        body: message,
        routingGroup: 'PREMIUM',
        encoding: 'TEXT',
      }),
    });

    const responseText = await response.text();
    console.log('BulkSMS Premium response:', response.status, responseText);

    let result: any = {};
    try { result = JSON.parse(responseText); } catch { result = { raw: responseText }; }

    try {
      await supabase.from('sms_logs').insert({
        recipient_phone: phone,
        recipient_name: meta.userName,
        recipient_email: meta.recipientEmail,
        message_content: message,
        message_type: meta.messageType || 'general',
        status: response.ok ? 'sent' : 'failed',
        provider: 'BulkSMS-Premium',
        provider_response: result,
        credits_used: 1,
        department: meta.department,
        triggered_by: meta.triggeredBy,
        request_id: meta.requestId,
        failure_reason: response.ok ? null : responseText,
      });
    } catch (dbErr) {
      console.error('Failed to log BulkSMS Premium:', dbErr);
    }

    return { success: response.ok, details: result };
  } catch (err) {
    console.error('BulkSMS Premium error:', err.message);
    return { success: false };
  }
}

// Message types that should be routed via BulkSMS Premium first (high-priority)
const PREMIUM_SMS_TYPES = new Set([
  'loan_reminder',
  'loan_guarantor_request',
  'loan_repayment',
  'loan_recovery',
  'loan_overdue',
  'loan_default',
  'loan_disbursed',
  'loan_paid_off',
  'loan',
  'guarantor_recovery',
  'job_application',
  'job_application_received',
  'job_application_shortlisted',
  'job_application_interview',
  'job_application_offer',
  'job_application_rejected',
  'job_application_status',
  'otp',
  'verification',
  'login_code',
  'twofa',
]);

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
    // Require service-role bearer or dedicated QUEUE_SECRET to prevent abuse
    const authHdr = req.headers.get('Authorization') || ''
    const queueSecret = Deno.env.get('SMS_QUEUE_SECRET') || ''
    const providedToken = authHdr.startsWith('Bearer ') ? authHdr.slice(7) : ''
    const queueAuthorized =
      (providedToken && providedToken === serviceRoleKey) ||
      (queueSecret && providedToken === queueSecret)
    if (!queueAuthorized) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
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
      'loan_repayment',
      'loan_recovery',
      'loan_overdue',
      'loan_default',
      'loan_disbursed',
      'loan_paid_off',
      'loan',
      'guarantor_recovery',
      'price_update',
      'supplier_price_broadcast',
      'payout_confirmation',
      'loan_advert',
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
      
      // Actually redirect to email when we have a recipient address.
      // Previously this was only LOGGED as redirected_to_email but no email
      // was ever sent — callers assumed the redirect happened.
      let emailSent = false
      if (recipientEmail) {
        try {
          // Check disabled flag — never email a disabled account.
          const { data: emp } = await supabase
            .from('employees')
            .select('disabled')
            .ilike('email', recipientEmail)
            .maybeSingle()

          if ((emp as any)?.disabled === true) {
            console.log(`🚫 Skipping email redirect — recipient disabled: ${recipientEmail}`)
          } else {
            const titleMap: Record<string, string> = {
              salary_approval: 'Salary Approved',
              salary_initialized: 'Salary Initialized',
              approval_request: 'Approval Required',
              field_financing_approval: 'Field Financing Approved',
              bonus_awarded: 'Bonus Awarded',
              withdrawal_enabled: 'Withdrawals Enabled',
              fraud_alert: 'Security Alert',
            }
            const title = titleMap[messageType?.toLowerCase() || ''] || 'Notification from Great Pearl Coffee'

            const { error: emailErr } = await supabase.functions.invoke('send-transactional-email', {
              body: {
                templateName: 'general-notification',
                recipientEmail,
                idempotencyKey: `sms-redirect-${messageType || 'general'}-${recipientEmail}-${Date.now()}`,
                templateData: {
                  title,
                  message,
                  recipientName: userName || 'Team',
                },
              },
            })
            if (emailErr) {
              console.error('SMS→email redirect failed to invoke send-transactional-email:', emailErr)
            } else {
              emailSent = true
              console.log(`📧 SMS redirected to email for ${recipientEmail}`)
            }
          }
        } catch (redirectErr) {
          console.error('SMS→email redirect error:', redirectErr)
        }
      } else {
        console.warn(`⚠️ SMS blocked but no recipientEmail provided — nothing was redirected (type: ${messageType})`)
      }

      // Log the outcome
      try {
        await supabase.from('sms_logs').insert({
          recipient_phone: phone,
          recipient_name: userName,
          recipient_email: recipientEmail,
          message_content: message?.substring(0, 50) + (emailSent ? '... [redirected to email]' : '... [blocked - no email sent]'),
          message_type: messageType || 'general',
          status: emailSent ? 'redirected_to_email' : 'blocked_no_email',
          provider: emailSent ? 'EMAIL_REDIRECT' : 'BLOCKED',
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
          emailSent,
          reason: emailSent
            ? 'Non-OTP SMS redirected to email.'
            : 'Non-OTP SMS blocked to save credits. No recipientEmail was provided to redirect to.',
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
    
    const callerPriority = (parsedBody.priority || '').toString().toLowerCase();
    const isPremium =
      callerPriority === 'premium' ||
      PREMIUM_SMS_TYPES.has((messageType || '').toLowerCase());

    // PREMIUM ROUTE: try BulkSMS Premium first, fall back to YoolaSMS/Infobip below if it fails
    if (isPremium) {
      console.log(`💎 Premium routing for type=${messageType}`);
      const bulkResult = await sendBulkSmsPremium(formattedPhone, message, supabase, {
        userName, recipientEmail, messageType, department, triggeredBy: triggeredBy || userId, requestId,
      });
      if (bulkResult.success) {
        return new Response(
          JSON.stringify({
            success: true,
            message: 'SMS sent via BulkSMS Premium',
            phone: formattedPhone,
            provider: 'BulkSMS-Premium',
            details: bulkResult.details,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.warn('⚠️ BulkSMS Premium failed, falling back to YoolaSMS');
    }

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

    // Final fallback: BulkSMS Premium (only try here if not already tried as premium)
    if (!isPremium) {
      console.log('Attempting BulkSMS Premium as final fallback...');
      const bulkResult = await sendBulkSmsPremium(formattedPhone, message, supabase, {
        userName, recipientEmail, messageType, department, triggeredBy: triggeredBy || userId, requestId,
      });
      if (bulkResult.success) {
        return new Response(
          JSON.stringify({
            success: true,
            message: 'SMS sent via final fallback (BulkSMS Premium)',
            phone: formattedPhone,
            provider: 'BulkSMS-Premium',
            details: bulkResult.details,
            fallback: true,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ 
        error: 'SMS failed via all providers (YoolaSMS, Infobip, BulkSMS)',
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
