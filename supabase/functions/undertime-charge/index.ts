import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const AMOUNT = 10000
// Staff on leave / excused for this run.
const EXCLUDED_EMAILS = new Set([
  'bwambaledenis@greatpearlcoffee.com',
  'kahindodaphne@greatpearlcoffee.com',
  'operations@greatpearlcoffee.com', // shared system account, not a person
])

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  let body: any = {}
  try { body = await req.json() } catch { /* empty body ok */ }
  const day = typeof body?.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date)
    ? body.date
    : new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Kampala' })
  const reason = String(body?.reason || 'Late arrival (undertime)')
  const initiatedBy = String(body?.initiated_by || 'Fauzakusa@greatpearlcoffee.com')
  // notify_only=true: re-send notifications for already-posted charges (no new debits).
  const notifyOnly = body?.notify_only === true
  const channels: string[] = Array.isArray(body?.channels) ? body.channels : ['email', 'sms']

  const { data: employees, error: empErr } = await supabase
    .from('employees')
    .select('id, name, email, phone, disabled, status')
    .eq('status', 'Active')
  if (empErr) {
    return new Response(JSON.stringify({ ok: false, error: empErr.message }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const targets = (employees || []).filter((e: any) =>
    e.disabled !== true && e.email && String(e.email).includes('@') &&
    !EXCLUDED_EMAILS.has(String(e.email).toLowerCase()),
  )

  const results: Record<string, unknown>[] = []

  const notify = async (emp: any, reference: string) => {
    const out: Record<string, unknown> = {}
    if (channels.includes('email')) {
      const { data: mailRes, error: mailErr } = await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'general-notification',
          recipientEmail: emp.email,
          idempotencyKey: `undertime-charge-${day}-${emp.id}`,
          templateData: {
            subject: `Undertime Charge of UGX ${AMOUNT.toLocaleString()} Applied`,
            title: 'Undertime Charge Applied',
            recipientName: emp.name,
            message: [
              `An undertime charge of UGX ${AMOUNT.toLocaleString()} has been deducted from your wallet for ${reason.toLowerCase()} on ${day}.`,
              '',
              'Detail | Value',
              `Charge | Undertime`,
              `Amount | UGX ${AMOUNT.toLocaleString()}`,
              `Date | ${day}`,
              `Reference | ${reference}`,
              '',
              'Please observe the official reporting time going forward. If you believe this was applied in error, contact HR or Administration.',
            ].join('\n'),
          },
        },
      })
      out.email_status = mailErr ? 'failed' : (mailRes as any)?.email_status || 'sent'
    }
    if (channels.includes('sms') && emp.phone) {
      const { data: smsRes, error: smsErr } = await supabase.functions.invoke('send-sms', {
        headers: { Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
        body: {
          phone: emp.phone,
          message: `Dear ${emp.name}, an undertime charge of UGX ${AMOUNT.toLocaleString()} has been deducted from your wallet for late arrival on ${day}. Ref ${reference}. Please keep to the official reporting time. - Great Agro Coffee`,
          userName: emp.name,
          messageType: 'wallet_debit',
          recipientEmail: emp.email,
          idempotency_key: `undertime-sms-${day}-${emp.id}`,
        },
      })
      out.sms_status = smsErr ? 'failed' : ((smsRes as any)?.success === false ? 'failed' : 'sent')
      if (out.sms_status === 'failed') out.sms_detail = smsErr ? (await (smsErr as any)?.context?.text?.().catch(() => smsErr.message) ?? smsErr.message) : smsRes
    }
    return out
  }

  for (const emp of targets) {
    try {
      const { data: userId } = await supabase.rpc('get_unified_user_id', { input_email: emp.email })
      if (!userId) { results.push({ email: emp.email, status: 'skipped', reason: 'no unified user id' }); continue }

      const reference = `UNDERTIME-${day}-${String(userId).slice(0, 8)}`
      const { data: existing } = await supabase
        .from('ledger_entries').select('id').eq('reference', reference).maybeSingle()

      if (existing) {
        if (notifyOnly) {
          results.push({ email: emp.email, name: emp.name, status: 'notified', ...(await notify(emp, reference)) })
        } else {
          results.push({ email: emp.email, status: 'already_charged' })
        }
        continue
      }
      if (notifyOnly) { results.push({ email: emp.email, status: 'skipped', reason: 'no charge to notify' }); continue }

      // Debit as a CHARGE: source FEE routes the money to Fees & Charges Income in the Treasury.
      const { error: ledgerErr } = await supabase.from('ledger_entries').insert({
        user_id: String(userId),
        entry_type: 'ADJUSTMENT',
        amount: -AMOUNT,
        reference,
        source_category: 'FEE',
        metadata: {
          type: 'undertime_charge',
          charge_type: 'Undertime',
          // Ledger-only wallet charge (no cash leaves the system) — skip the legacy
          // Yo float pre-check; the Treasury accounts trigger still posts it to Fees Income.
          bypass_treasury_check: true,
          employee_name: emp.name,
          employee_email: emp.email,
          date: day,
          reason,
          initiated_by: initiatedBy,
          description: `Undertime charge UGX ${AMOUNT.toLocaleString()} — ${reason} on ${day}`,
        },
        created_at: new Date().toISOString(),
      })
      if (ledgerErr) { results.push({ email: emp.email, status: 'failed', reason: ledgerErr.message }); continue }

      results.push({ email: emp.email, name: emp.name, status: 'charged', reference, ...(await notify(emp, reference)) })
    } catch (e) {
      results.push({ email: emp.email, status: 'error', reason: String(e) })
    }
  }

  return new Response(JSON.stringify({ ok: true, amount: AMOUNT, date: day, results }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
