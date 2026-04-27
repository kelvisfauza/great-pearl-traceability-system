import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { sendLovableEmail } from 'npm:@lovable.dev/email-js@0.0.4'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5'
import { TEMPLATES } from '../_shared/transactional-email-templates/registry.ts'

const SITE_NAME = "Great Agro Coffee"
const SENDER_DOMAIN = "notify.greatpearlcoffeesystem.site"
const FROM_DOMAIN = "notify.greatpearlcoffeesystem.site"

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')
  if (!lovableApiKey) {
    return new Response(
      JSON.stringify({ error: 'Email service not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  let templateName: string
  let recipientEmail: string
  let idempotencyKey: string
  let templateData: Record<string, any> = {}

  try {
    const body = await req.json()
    templateName = body.templateName || body.template_name
    recipientEmail = body.recipientEmail || body.recipient_email
    idempotencyKey = body.idempotencyKey || body.idempotency_key || crypto.randomUUID()
    const rawData = body.templateData || body.data
    if (rawData && typeof rawData === 'object') {
      templateData = rawData
    }
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON in request body' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  if (!templateName) {
    return new Response(
      JSON.stringify({ error: 'templateName is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const template = TEMPLATES[templateName]
  if (!template) {
    return new Response(
      JSON.stringify({ error: `Template '${templateName}' not found. Available: ${Object.keys(TEMPLATES).join(', ')}` }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const effectiveRecipient = template.to || recipientEmail
  if (!effectiveRecipient) {
    return new Response(
      JSON.stringify({ error: 'recipientEmail is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // Render React Email template
    const html = await renderAsync(
      React.createElement(template.component, templateData)
    )
    const plainText = await renderAsync(
      React.createElement(template.component, templateData),
      { plainText: true }
    )

    const resolvedSubject =
      typeof template.subject === 'function'
        ? template.subject(templateData)
        : template.subject

    const unsubToken = generateToken()

    // Send directly using Lovable Email API
    await sendLovableEmail(
      {
        to: effectiveRecipient,
        from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
        reply_to: 'operations@greatpearlcoffee.com',
        sender_domain: SENDER_DOMAIN,
        subject: resolvedSubject,
        html,
        text: plainText,
        purpose: 'transactional',
        label: templateName,
        idempotency_key: idempotencyKey,
        unsubscribe_token: unsubToken,
      },
      {
        apiKey: lovableApiKey,
        idempotencyKey,
      }
    )

    console.log('✅ Transactional email sent', { templateName, effectiveRecipient })

    const OPERATIONS_EMAIL = 'operations@greatpearlcoffee.com'

    // Send CC copy to operations (skip if operations is the recipient)
    if (effectiveRecipient.toLowerCase() !== OPERATIONS_EMAIL.toLowerCase()) {
      try {
        // Derive a grouped idempotency key: strip recipient-specific parts
        // so that if the same template+context is sent to multiple people,
        // only ONE copy reaches operations
        const baseKey = idempotencyKey
          .replace(effectiveRecipient, '')
          .replace(/[^a-zA-Z0-9-_]/g, '')
        const opsIdempotencyKey = `ops-cc-${templateName}-${baseKey}`
        const opsUnsubToken = generateToken()

        const ccSubject = `[CC] ${resolvedSubject}`
        const ccNote = `<div style="background:#f0f4f8;padding:12px 16px;border-radius:6px;margin-bottom:20px;font-family:Arial,sans-serif;font-size:13px;color:#334155;">
          <strong>📋 Operations Copy</strong><br/>
          Original recipient: <strong>${effectiveRecipient}</strong><br/>
          Template: ${templateName} | Sent: ${new Date().toLocaleString('en-UG', { timeZone: 'Africa/Kampala' })}
        </div>`
        const opsHtml = html.replace(/<body[^>]*>/, (match: string) => `${match}${ccNote}`)

        await sendLovableEmail(
          {
            to: OPERATIONS_EMAIL,
            from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
            reply_to: OPERATIONS_EMAIL,
            sender_domain: SENDER_DOMAIN,
            subject: ccSubject,
            html: opsHtml,
            text: `[CC - Sent to: ${effectiveRecipient}]\n\n${plainText}`,
            purpose: 'transactional',
            label: `cc-${templateName}`,
            idempotency_key: opsIdempotencyKey,
            unsubscribe_token: opsUnsubToken,
          },
          {
            apiKey: lovableApiKey,
            idempotencyKey: opsIdempotencyKey,
          }
        )
        console.log(`📋 Operations CC sent for ${templateName} (original: ${effectiveRecipient})`)
      } catch (ccErr) {
        console.warn('⚠️ Failed to send operations CC:', ccErr.message)
      }
    }

    // Log to sent_emails_log
    try {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )
      await supabaseAdmin.from('sent_emails_log').insert({
        template_name: templateName,
        recipient_email: effectiveRecipient,
        subject: resolvedSubject,
        status: 'sent',
        idempotency_key: idempotencyKey,
        metadata: templateData,
      })
    } catch (logErr) {
      console.warn('⚠️ Failed to log email send:', logErr.message)
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('❌ Failed to send transactional email', { error: (error as Error).message, templateName, effectiveRecipient })

    // Log failure
    try {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )
      await supabaseAdmin.from('sent_emails_log').insert({
        template_name: templateName,
        recipient_email: effectiveRecipient,
        subject: typeof template.subject === 'function' ? template.subject(templateData) : template.subject,
        status: 'failed',
        error_message: (error as Error).message,
        idempotency_key: idempotencyKey,
        metadata: templateData,
      })
    } catch (logErr) {
      console.warn('⚠️ Failed to log email failure:', logErr.message)
    }

    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Failed to send email' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
