import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

  const fromEmail = from || 'noreply@greatpearlcoffee.com'

  try {
    console.log(`📧 Sending email via SendGrid to: ${to}`)
    
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
          { type: 'text/html', value: message.replace(/\n/g, '<br>') }
        ]
      })
    })

    if (response.status === 202 || response.status === 200) {
      console.log(`✅ Email sent successfully to ${to}`)
      return { success: true }
    }

    const errorText = await response.text()
    console.error(`❌ SendGrid error: ${response.status} - ${errorText}`)
    return { success: false, error: `SendGrid error: ${response.status}` }
  } catch (error) {
    console.error('❌ SendGrid exception:', error)
    return { success: false, error: error.message }
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
    console.log(`📱 Sending SMS via Twilio to: ${to}`)
    
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
    return { success: false, error: error.message }
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
    
    console.log(`💬 Sending WhatsApp via Twilio to: whatsapp:${formattedTo}`)
    
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
    return { success: false, error: error.message }
  }
}

// Yoola SMS sender (existing provider)
async function sendSMSViaYoola(to: string, message: string): Promise<{ success: boolean; error?: string }> {
  const apiKey = Deno.env.get('YOOLA_SMS_API_KEY')
  if (!apiKey) {
    return { success: false, error: 'Yoola API key not configured' }
  }

  try {
    // Format phone number
    let formattedPhone = to.replace(/\s+/g, '').replace(/^0/, '+256')
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+' + formattedPhone
    }

    console.log(`📱 Sending SMS via Yoola to: ${formattedPhone}`)

    const response = await fetch('https://api.yoolasms.com/v1/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: formattedPhone,
        message: message,
        sender_id: 'GreatPearl'
      })
    })

    if (response.ok) {
      console.log(`✅ SMS sent successfully via Yoola`)
      return { success: true }
    }

    const errorText = await response.text()
    console.error(`❌ Yoola error: ${response.status} - ${errorText}`)
    return { success: false, error: `Yoola error: ${response.status}` }
  } catch (error) {
    console.error('❌ Yoola exception:', error)
    return { success: false, error: error.message }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { channel, to, subject, message, from, provider } = await req.json() as MessageRequest

    if (!channel || !to || !message) {
      throw new Error('Missing required fields: channel, to, message')
    }

    console.log(`📨 Processing ${channel} message to: ${to}`)

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
        result = await sendEmailViaSendGrid(to, subject || 'Notification', message, from)
        break

      case 'sms':
        const smsProvider = provider || settingsMap['sms_provider'] || 'yoola'
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

    // Log the message
    await supabase.from('message_logs').insert({
      channel,
      recipient: to,
      message: message.substring(0, 500),
      status: result.success ? 'sent' : 'failed',
      error: result.error,
      provider: channel === 'sms' ? (provider || settingsMap['sms_provider'] || 'yoola') : 
                channel === 'email' ? 'sendgrid' : 'twilio'
    }).catch(err => console.log('Failed to log message:', err))

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
