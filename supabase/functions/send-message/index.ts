import { requireStaff } from "../_shared/internal-auth.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';
import { ownTestDestination, SETTINGS_TEST_MESSAGE, SETTINGS_TEST_SUBJECT } from '../_shared/message-policy.ts';

interface MessageRequest {
  channel: 'email' | 'sms' | 'whatsapp'
  to: string
  subject?: string
  message: string
  from?: string
  provider?: 'sendgrid' | 'twilio' | 'yoola'
}

// SendGrid Email sender
async function sendEmailViaSendGrid(to: string, subject: string, message: string, from?: string): Promise<{ success: boolean; error?: string }> {
  const apiKey = Deno.env.get('SENDGRID_API_KEY')
  if (!apiKey) {
    return { success: false, error: 'SendGrid API key not configured' }
  }

  const fromEmail = from || 'noreply@greatagrocoffee.com'

  try {
    console.log('Operation recorded; private details omitted')
    
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: fromEmail },
        subject: subject,
        content: [
          { type: 'text/plain', value: message },
          { type: 'text/html', value: String(message).replace(/[&<>"']/g, (c: string) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'} as Record<string,string>)[c]).replace(/\n/g, '<br>') }
        ]
      })
    })

    if (response.status === 202 || response.status === 200) {
      console.log('Operation recorded; private details omitted')
      return { success: true }
    }

    const errorText = await response.text()
    console.error(`❌ SendGrid error: ${response.status} - ${errorText}`)
    return { success: false, error: `SendGrid error: ${response.status}` }
  } catch (error) {
    console.error('❌ SendGrid exception:', error)
    return { success: false, error: (error as Error).message }
  }
}

// Twilio SMS sender
async function sendSMSViaTwilio(to: string, message: string): Promise<{ success: boolean; error?: string }> {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')
  const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER')

  if (!accountSid || !authToken || !fromNumber) {
    return { success: false, error: 'Twilio credentials not configured' }
  }

  try {
    console.log('Operation recorded; private details omitted')
    
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: to,
          From: fromNumber,
          Body: message
        })
      }
    )

    const data = await response.json()
    
    if (data.sid) {
      console.log(`✅ SMS sent successfully via Twilio: ${data.sid}`)
      return { success: true }
    }

    console.error('❌ Twilio error:', data)
    return { success: false, error: data.message || 'Twilio error' }
  } catch (error) {
    console.error('❌ Twilio exception:', error)
    return { success: false, error: (error as Error).message }
  }
}

// Twilio WhatsApp sender
async function sendWhatsAppViaTwilio(to: string, message: string): Promise<{ success: boolean; error?: string }> {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')
  const whatsappNumber = Deno.env.get('TWILIO_WHATSAPP_NUMBER')

  if (!accountSid || !authToken || !whatsappNumber) {
    return { success: false, error: 'Twilio WhatsApp credentials not configured' }
  }

  try {
    // Format the phone number for WhatsApp
    let formattedTo = to.replace(/\s+/g, '').replace(/^0/, '+256')
    if (!formattedTo.startsWith('+')) {
      formattedTo = '+' + formattedTo
    }
    
    console.log('Operation recorded; private details omitted')
    
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: `whatsapp:${formattedTo}`,
          From: `whatsapp:${whatsappNumber}`,
          Body: message
        })
      }
    )

    const data = await response.json()
    
    if (data.sid) {
      console.log(`✅ WhatsApp sent successfully via Twilio: ${data.sid}`)
      return { success: true }
    }

    console.error('❌ Twilio WhatsApp error:', data)
    return { success: false, error: data.message || 'Twilio WhatsApp error' }
  } catch (error) {
    console.error('❌ Twilio WhatsApp exception:', error)
    return { success: false, error: (error as Error).message }
  }
}

// Yoola SMS sender (existing provider)
async function sendSMSViaYoola(to: string, message: string): Promise<{ success: boolean; error?: string }> {
  const apiKey = Deno.env.get('YOOLA_SMS_API_KEY')
  if (!apiKey) {
    return { success: false, error: 'Yoola API key not configured' }
  }

  try {
    console.log('Operation recorded; private details omitted')

    const response = await fetch('https://yoolasms.com/api/v1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phone: to,
        message: message,
        api_key: apiKey,
      })
    })

    const providerResult = await response.json().catch(() => null);
    if (response.ok && (providerResult?.status === 'success' || providerResult?.success === true)) {
      console.log(`✅ SMS sent successfully via Yoola`)
      return { success: true }
    }

    console.error(`Yoola test was not accepted: ${response.status}`)
    return { success: false, error: `Yoola error: ${response.status}` }
  } catch (error) {
    console.error('❌ Yoola exception:', error)
    return { success: false, error: (error as Error).message }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  const __caller = await requireStaff(req, corsHeaders);
  if (__caller instanceof Response) return __caller;
  const itClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', { global: { headers: { Authorization: req.headers.get('Authorization') || '' } } });
  const { data: itAllowed } = __caller.email ? await itClient.rpc('user_has_permission', { permission_name: 'IT Management' }) : { data: false };
  if ((!__caller.isAdmin && itAllowed !== true) || !__caller.email) return new Response(JSON.stringify({ success: false, error: 'Only signed-in administrators or IT managers can run message tests.' }), {
    status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const parsed = z.object({ channel: z.enum(['email', 'sms', 'whatsapp']), to: z.string().max(255).optional() }).strict().safeParse(await req.json());
    if (!parsed.success) throw new Error('Choose a test channel. Custom content and sender overrides are not allowed.');
    const { channel } = parsed.data;
    const { data: employee, error: employeeError } = await supabase.from('employees')
      .select('email,phone,alt_phone,status,disabled').ilike('email', __caller.email).maybeSingle();
    if (employeeError || !employee || employee.disabled === true || String(employee.status).toLowerCase() !== 'active') throw new Error('Your saved active account could not be checked.');
    const to = ownTestDestination(channel, parsed.data.to, employee);
    const subject = SETTINGS_TEST_SUBJECT;
    const message = SETTINGS_TEST_MESSAGE;
    const { data: recent, error: recentError } = await supabase.from('audit_logs').select('id')
      .eq('action', 'message_test').eq('record_id', __caller.userId)
      .gte('created_at', new Date(Date.now() - 60_000).toISOString()).limit(1);
    if (recentError) throw new Error('The test limit could not be checked.');
    if (recent?.length) throw new Error('Please wait one minute before another message test.');
    const { error: auditError } = await supabase.from('audit_logs').insert({
      action: 'message_test', table_name: 'employees', record_id: __caller.userId,
      performed_by: __caller.email, record_data: { channel, template: 'connection_test' },
    });
    if (auditError) throw new Error('The test could not be registered. No message was sent.');

    // Get system settings for default providers
    const { data: settings } = await supabase
      .from('system_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['sms_provider', 'email_provider', 'whatsapp_provider'])

    const settingsMap = settings?.reduce((acc, s) => {
      acc[s.setting_key] = s.setting_value
      return acc
    }, {} as Record<string, string>) || {}

    let result: { success: boolean; error?: string }

    switch (channel) {
      case 'email':
        result = await sendEmailViaSendGrid(to, subject, message)
        break

      case 'sms':
        const smsProvider = settingsMap['sms_provider'] || 'yoola'
        if (smsProvider === 'twilio') {
          result = await sendSMSViaTwilio(to, message)
        } else {
          result = await sendSMSViaYoola(to, message)
        }
        break

      case 'whatsapp':
        result = await sendWhatsAppViaTwilio(to, message)
        break

      default:
        throw new Error(`Unsupported channel: ${channel}`)
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
