import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ADMIN_RECIPIENTS = [
  'fauzakusa@greatpearlcoffee.com',
  'operations@greatpearlcoffee.com',
]

const SUPPORT_ADDRESS = 'support@greatpearlcoffee.com'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const body = await req.json().catch(() => ({}))
    const name = String(body.customer_name || '').trim()
    const email = String(body.customer_email || '').trim().toLowerCase()
    const phone = body.customer_phone ? String(body.customer_phone).trim() : null
    const subject = String(body.subject || '').trim()
    const message = String(body.message || '').trim()
    const category = body.category ? String(body.category).trim() : null
    const priority = ['low','medium','high','urgent'].includes(body.priority) ? body.priority : 'medium'

    if (!name || name.length > 120) {
      return json({ ok: false, error: 'Name is required (max 120 chars)' })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) {
      return json({ ok: false, error: 'Valid email is required' })
    }
    if (!subject || subject.length > 200) {
      return json({ ok: false, error: 'Subject is required (max 200 chars)' })
    }
    if (!message || message.length > 5000) {
      return json({ ok: false, error: 'Message is required (max 5000 chars)' })
    }

    const { data: codeRow, error: codeErr } = await supabase.rpc('generate_support_ticket_code')
    if (codeErr) throw codeErr
    const ticket_code = codeRow as string

    const { data: ticket, error: insErr } = await supabase
      .from('support_tickets')
      .insert({
        ticket_code,
        customer_name: name,
        customer_email: email,
        customer_phone: phone,
        subject,
        message,
        category,
        priority,
        status: 'open',
        source: 'web_form',
      })
      .select('id, ticket_code')
      .single()
    if (insErr) throw insErr

    // Confirmation to customer
    try {
      await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'general-notification',
          recipientEmail: email,
          idempotencyKey: `ticket-conf-${ticket.id}`,
          templateData: {
            title: `Ticket ${ticket.ticket_code} received`,
            subject: `[${ticket.ticket_code}] We received your message — Great Agro Coffee`,
            recipientName: name,
            message:
              `Hello ${name},\n\n` +
              `Thank you for contacting Great Agro Coffee. Your support ticket has been logged.\n\n` +
              `Ticket ID: ${ticket.ticket_code}\n` +
              `Subject:   ${subject}\n\n` +
              `Your message:\n${message}\n\n` +
              `Our team will get back to you shortly. When replying, please keep the ticket ID in the subject so we can track your conversation.\n\n` +
              `— Customer Support, Great Agro Coffee\n` +
              `${SUPPORT_ADDRESS}`,
          },
        },
      })
    } catch (e) { console.error('customer email failed', e) }

    // Notify admins
    for (const to of ADMIN_RECIPIENTS) {
      try {
        await supabase.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'general-notification',
            recipientEmail: to,
            idempotencyKey: `ticket-admin-${ticket.id}-${to}`,
            templateData: {
              title: `New support ticket ${ticket.ticket_code}`,
              subject: `[New Ticket ${ticket.ticket_code}] ${subject}`,
              recipientName: to.split('@')[0],
              message:
                `A new customer support ticket was submitted.\n\n` +
                `Ticket ID: ${ticket.ticket_code}\n` +
                `Priority:  ${priority}\n` +
                `From:      ${name} <${email}>${phone ? `\nPhone:     ${phone}` : ''}\n` +
                (category ? `Category:  ${category}\n` : '') +
                `Subject:   ${subject}\n\n` +
                `Message:\n${message}\n\n` +
                `Open the Customer Support inbox in the admin panel to reply.`,
            },
          },
        })
      } catch (e) { console.error('admin email failed', to, e) }
    }

    return json({ ok: true, ticket_code: ticket.ticket_code })
  } catch (e) {
    console.error('submit-support-ticket error', e)
    return json({ ok: false, error: (e as Error).message })
  }
})

function json(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}