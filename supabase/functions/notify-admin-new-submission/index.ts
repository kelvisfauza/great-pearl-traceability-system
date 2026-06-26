import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RECIPIENTS = [
  'fauzakusa@greatpearlcoffee.com',
  'operations@greatpearlcoffee.com',
  'denis@greatpearlcoffee.com',
  'wyclif@greatpearlcoffee.com',
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const p = await req.json().catch(() => ({}))
    const {
      request_type, provider_name, phone, email, amount,
      description, invoice_number, national_id, submission_id,
    } = p || {}

    const typeLabel =
      request_type === 'meal_plan' ? 'Meal Plan Payment'
      : request_type === 'support_staff_per_diem' ? 'Support Staff Per-Diem'
      : 'Service Provider Payment'

    const fmtAmt = `UGX ${Number(amount || 0).toLocaleString()}`
    const subject = `[Approval Needed] ${typeLabel} — ${provider_name} — ${fmtAmt}`
    const message =
      `A new self-submitted request is awaiting approval.\n\n` +
      `Type:        ${typeLabel}\n` +
      `Name:        ${provider_name}\n` +
      `Phone:       ${phone}\n` +
      (email ? `Email:       ${email}\n` : '') +
      `Amount:      ${fmtAmt}\n` +
      (invoice_number ? `Invoice No:  ${invoice_number}\n` : '') +
      (national_id ? `National ID: ${national_id}\n` : '') +
      `\nDescription:\n${description || '(none)'}\n\n` +
      `Review and approve in Approvals → Self-Submitted Provider Requests.`

    let sent = 0
    for (const recipient of RECIPIENTS) {
      try {
        const { error } = await supabase.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'general-notification',
            recipientEmail: recipient,
            idempotencyKey: `submission-${submission_id || `${provider_name}-${amount}-${Date.now()}`}-${recipient}`,
            templateData: {
              title: 'Pending Approval — Self-Submitted Request',
              subject,
              message,
              recipientName: recipient.split('@')[0],
            },
          },
        })
        if (!error) sent++
      } catch (_) { /* swallow */ }
    }

    return new Response(JSON.stringify({ ok: true, sent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})