import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPPORT_ADDRESS = 'support@greatpearlcoffee.com'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization') || ''
    const jwt = authHeader.replace(/^Bearer\s+/i, '')
    if (!jwt) return json({ ok: false, error: 'Not authenticated' }, 401)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: userData, error: userErr } = await supabase.auth.getUser(jwt)
    if (userErr || !userData?.user) return json({ ok: false, error: 'Invalid session' }, 401)
    const user = userData.user

    const body = await req.json().catch(() => ({}))
    const ticketId = String(body.ticket_id || '')
    const message = String(body.message || '').trim()
    const isInternal = !!body.is_internal_note
    const newStatus = body.new_status ? String(body.new_status) : null

    if (!ticketId) return json({ ok: false, error: 'ticket_id required' })
    if (!message || message.length > 5000) return json({ ok: false, error: 'Message required (max 5000 chars)' })

    const { data: ticket, error: tErr } = await supabase
      .from('support_tickets').select('*').eq('id', ticketId).single()
    if (tErr || !ticket) return json({ ok: false, error: 'Ticket not found' })

    const authorName = user.user_metadata?.name || user.email?.split('@')[0] || 'Support'

    const { error: rErr } = await supabase.from('support_ticket_replies').insert({
      ticket_id: ticketId,
      author_type: 'admin',
      author_name: authorName,
      author_email: user.email,
      author_user_id: user.id,
      message,
      is_internal_note: isInternal,
    })
    if (rErr) throw rErr

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (newStatus && ['open','in-progress','resolved','closed'].includes(newStatus)) {
      updates.status = newStatus
      if (newStatus === 'resolved') updates.resolved_at = new Date().toISOString()
      if (newStatus === 'closed') updates.closed_at = new Date().toISOString()
    } else if (ticket.status === 'open') {
      updates.status = 'in-progress'
    }
    await supabase.from('support_tickets').update(updates).eq('id', ticketId)

    // Email the customer (skip for internal notes)
    if (!isInternal) {
      try {
        await supabase.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'general-notification',
            recipientEmail: ticket.customer_email,
            idempotencyKey: `ticket-reply-${ticketId}-${Date.now()}`,
            templateData: {
              title: `Reply on ticket ${ticket.ticket_code}`,
              subject: `[${ticket.ticket_code}] Re: ${ticket.subject}`,
              recipientName: ticket.customer_name,
              message:
                `Hello ${ticket.customer_name},\n\n` +
                `A reply has been posted on your support ticket ${ticket.ticket_code}.\n\n` +
                `${message}\n\n` +
                `If you need to reply, please quote your ticket ID (${ticket.ticket_code}) so we can track your message.\n\n` +
                `— ${authorName}\nCustomer Support, Great Agro Coffee\n${SUPPORT_ADDRESS}`,
            },
          },
        })
      } catch (e) { console.error('reply email failed', e) }
    }

    return json({ ok: true })
  } catch (e) {
    console.error('reply-support-ticket error', e)
    return json({ ok: false, error: (e as Error).message })
  }
})

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}