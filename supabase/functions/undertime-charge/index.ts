import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const AMOUNT = 10000
const OD_FEE_RATE = 0.0275
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
  // fix_overdraft_fees=true: apply the missing 2.75% overdraft access fee to charges already posted.
  const fixOverdraftFees = body?.fix_overdraft_fees === true
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

  const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)

  // Overdraft rule: any part of a charge funded by overdraft carries a 2.75% access fee,
  // which is added to the user's outstanding overdraft and booked as Treasury profit.
  const applyOverdraftFee = async (emp: any, userId: string, reference: string, overdraftPortion: number) => {
    const fee = Math.round(overdraftPortion * OD_FEE_RATE)
    if (fee <= 0) return { overdraft_portion: overdraftPortion, access_fee: 0 }
    const feeRef = `${reference}-ODFEE`
    const { data: feeExists } = await supabase.from('ledger_entries').select('id').eq('reference', feeRef).maybeSingle()
    if (feeExists) return { overdraft_portion: overdraftPortion, access_fee: fee, fee_status: 'already_applied' }

    // 1) Ensure an overdraft account (auto-managed, 50k limit) when the id is a real auth uuid.
    let odAccountId: string | null = null
    if (isUuid(userId)) {
      const { data: acc } = await supabase.from('overdraft_accounts')
        .select('id, outstanding_balance, total_drawn, approved_limit')
        .eq('user_id', userId).eq('status', 'active').maybeSingle()
      let account = acc
      if (!account) {
        const { data: created } = await supabase.from('overdraft_accounts').insert({
          user_id: userId, employee_email: emp.email, employee_name: emp.name,
          approved_limit: 50000, status: 'active', approved_by: 'SYSTEM_AUTO_UNDERTIME_CHARGE',
          activation_fee_paid: true, auto_managed: true,
        }).select('id, outstanding_balance, total_drawn, approved_limit').single()
        account = created
      }
      if (account) {
        odAccountId = account.id
        const priorOut = Number(account.outstanding_balance || 0)
        const newOut = priorOut + overdraftPortion + fee
        await supabase.from('overdraft_accounts').update({
          outstanding_balance: newOut,
          total_drawn: Number(account.total_drawn || 0) + overdraftPortion,
          last_used_at: new Date().toISOString(),
          first_negative_at: priorOut <= 0 ? new Date().toISOString() : undefined,
          updated_at: new Date().toISOString(),
        }).eq('id', account.id)
        await supabase.from('overdraft_transactions').insert([
          { account_id: account.id, user_id: userId, transaction_type: 'draw', amount: overdraftPortion,
            balance_after: priorOut + overdraftPortion, reference,
            metadata: { source: 'undertime_charge', date: day, access_fee: fee } },
          { account_id: account.id, user_id: userId, transaction_type: 'fee', amount: fee,
            balance_after: newOut, reference: feeRef,
            metadata: { source: 'undertime_charge', fee_rate: OD_FEE_RATE, draw_amount: overdraftPortion, note: '2.75% access fee on draw, added to outstanding' } },
        ])
      }
    }

    // 2) Wallet ledger fee line (shows on the statement).
    const { error: feeErr } = await supabase.from('ledger_entries').insert({
      user_id: userId,
      entry_type: 'FEE',
      amount: -fee,
      reference: feeRef,
      source_category: 'OVERDRAFT_FEE',
      metadata: {
        type: 'overdraft_access_fee',
        overdraft_account_id: odAccountId,
        fee_rate: OD_FEE_RATE,
        draw_amount: overdraftPortion,
        undertime_reference: reference,
        employee_name: emp.name,
        employee_email: emp.email,
        bypass_treasury_check: true,
        description: `Overdraft access fee (2.75%) on UGX ${overdraftPortion.toLocaleString()} drawn for undertime charge ${day}`,
      },
    })
    if (feeErr) return { overdraft_portion: overdraftPortion, access_fee: fee, fee_status: 'failed', fee_error: feeErr.message }

    // 3) Treasury: the ledger trigger books the fee (Loans & Overdrafts -> Profits) automatically.

    // 4) Tell the employee.
    if (channels.includes('sms') && emp.phone) {
      await supabase.functions.invoke('send-sms', {
        headers: { Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
        body: {
          phone: emp.phone,
          message: `Dear ${emp.name}, your wallet had insufficient funds for the UGX ${AMOUNT.toLocaleString()} undertime charge. UGX ${overdraftPortion.toLocaleString()} was drawn from your overdraft with a 2.75% access fee of UGX ${fee.toLocaleString()}, added to your outstanding overdraft. Ref ${feeRef}. - Great Agro Coffee`,
          userName: emp.name, messageType: 'wallet_debit', recipientEmail: emp.email,
        },
      })
    }
    return { overdraft_portion: overdraftPortion, access_fee: fee, fee_status: 'applied' }
  }

  for (const emp of targets) {
    try {
      const { data: userId } = await supabase.rpc('get_unified_user_id', { input_email: emp.email })
      if (!userId) { results.push({ email: emp.email, status: 'skipped', reason: 'no unified user id' }); continue }

      const reference = `UNDERTIME-${day}-${String(userId).slice(0, 8)}`
      const { data: existing } = await supabase
        .from('ledger_entries').select('id, created_at').eq('reference', reference).maybeSingle()

      if (existing) {
        if (notifyOnly) {
          results.push({ email: emp.email, name: emp.name, status: 'notified', ...(await notify(emp, reference)) })
        } else if (fixOverdraftFees) {
          // Reconstruct the balance just before the charge was posted.
          const { data: before } = await supabase.rpc('get_wallet_balance_before', {
            p_user_id: String(userId), p_before: existing.created_at,
          }).maybeSingle()
          const balBefore = Number((before as any) ?? 0)
          const portion = Math.max(0, Math.min(AMOUNT, AMOUNT - Math.max(balBefore, 0)))
          results.push({ email: emp.email, name: emp.name, status: 'fee_check', balance_before: balBefore,
            ...(portion > 0 ? await applyOverdraftFee(emp, String(userId), reference, portion) : { overdraft_portion: 0, access_fee: 0 }) })
        } else {
          results.push({ email: emp.email, status: 'already_charged' })
        }
        continue
      }
      if (notifyOnly || fixOverdraftFees) { results.push({ email: emp.email, status: 'skipped', reason: 'no charge on record' }); continue }

      // Balance before the charge — decides how much overdraft funds it.
      const { data: effBal } = await supabase.rpc('get_effective_wallet_balance', { p_user_id: String(userId) })
      const balBefore = Number(effBal) || 0
      const overdraftPortion = Math.max(0, Math.min(AMOUNT, AMOUNT - Math.max(balBefore, 0)))

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
          overdraft_portion: overdraftPortion,
          description: `Undertime charge UGX ${AMOUNT.toLocaleString()} — ${reason} on ${day}`,
        },
        created_at: new Date().toISOString(),
      })
      if (ledgerErr) { results.push({ email: emp.email, status: 'failed', reason: ledgerErr.message }); continue }

      const odInfo = overdraftPortion > 0
        ? await applyOverdraftFee(emp, String(userId), reference, overdraftPortion)
        : { overdraft_portion: 0, access_fee: 0 }
      results.push({ email: emp.email, name: emp.name, status: 'charged', reference, ...odInfo, ...(await notify(emp, reference)) })
    } catch (e) {
      results.push({ email: emp.email, status: 'error', reason: String(e) })
    }
  }

  return new Response(JSON.stringify({ ok: true, amount: AMOUNT, date: day, results }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
