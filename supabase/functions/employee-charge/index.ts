// Admin-initiated wallet charge for a single employee (undertime, lateness,
// damages, etc.). The debit is booked as a FEE (Fees & Charges Income in the
// Treasury). Any part that the wallet cannot cover is funded from overdraft
// and carries the standard 2.75% access fee. The employee is told by email + SMS.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://esm.sh/zod@3.23.8'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (b: unknown) =>
  new Response(JSON.stringify(b), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

const OD_FEE_RATE = 0.0275
const REASONS: Record<string, string> = {
  undertime: 'Undertime',
  late_arrival: 'Late arrival',
  absence: 'Unexcused absence',
  damages: 'Damages / loss of company property',
  policy_breach: 'Policy breach',
  uniform: 'Uniform / PPE non-compliance',
  other: 'Other charge',
}

const Body = z.object({
  employee_email: z.string().trim().email().max(255),
  amount: z.number().int().min(100).max(5_000_000),
  reason_code: z.enum(Object.keys(REASONS) as [string, ...string[]]),
  note: z.string().trim().max(300).optional().default(''),
  charge_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
const ugx = (n: number) => `UGX ${Math.round(n).toLocaleString()}`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const url = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const authHeader = req.headers.get('Authorization') || ''
  if (!authHeader.startsWith('Bearer ')) return json({ ok: false, error: 'Unauthorized' })

  const authClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } })
  const { data: userData, error: userErr } = await authClient.auth.getUser()
  if (userErr || !userData?.user?.email) return json({ ok: false, error: 'Invalid session' })
  const actorEmail = userData.user.email

  const supabase = createClient(url, serviceKey)
  const { data: actor } = await supabase.from('employees').select('name, role').ilike('email', actorEmail).maybeSingle()
  if (!actor || !['Administrator', 'Super Admin'].includes(actor.role || '')) {
    return json({ ok: false, error: 'Administrators only' })
  }

  let raw: unknown
  try { raw = await req.json() } catch { return json({ ok: false, error: 'Invalid body' }) }
  const parsed = Body.safeParse(raw)
  if (!parsed.success) return json({ ok: false, error: 'Invalid input', details: parsed.error.flatten().fieldErrors })
  const { employee_email, amount, reason_code, note } = parsed.data
  const day = parsed.data.charge_date || new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Kampala' })
  const reasonLabel = REASONS[reason_code]
  const reasonText = note ? `${reasonLabel} — ${note}` : reasonLabel

  const { data: emp } = await supabase.from('employees')
    .select('id, name, email, phone, disabled, status').ilike('email', employee_email).maybeSingle()
  if (!emp) return json({ ok: false, error: 'Employee not found' })
  if (emp.disabled === true) return json({ ok: false, error: 'This account is disabled' })

  const { data: userId } = await supabase.rpc('get_unified_user_id', { input_email: emp.email })
  if (!userId) return json({ ok: false, error: 'Could not resolve the employee wallet' })
  const uid = String(userId)

  const { data: effBal } = await supabase.rpc('get_effective_wallet_balance', { p_user_id: uid })
  const balBefore = Number(effBal) || 0
  const overdraftPortion = Math.max(0, Math.min(amount, amount - Math.max(balBefore, 0)))
  const accessFee = Math.round(overdraftPortion * OD_FEE_RATE)

  const reference = `CHARGE-${day.replace(/-/g, '')}-${uid.slice(0, 8)}-${Date.now().toString(36).toUpperCase()}`

  // 1) Main charge → Fees & Charges Income
  const { error: ledgerErr } = await supabase.from('ledger_entries').insert({
    user_id: uid,
    entry_type: 'ADJUSTMENT',
    amount: -amount,
    reference,
    source_category: 'FEE',
    metadata: {
      type: 'employee_charge',
      charge_type: reasonLabel,
      reason_code,
      note,
      bypass_treasury_check: true, // ledger-only debit; no cash leaves the system
      employee_name: emp.name,
      employee_email: emp.email,
      date: day,
      initiated_by: actorEmail,
      initiated_by_name: actor.name,
      overdraft_portion: overdraftPortion,
      description: `${reasonLabel} charge ${ugx(amount)} on ${day}${note ? ` — ${note}` : ''}`,
    },
  })
  if (ledgerErr) return json({ ok: false, error: ledgerErr.message })

  // 2) Overdraft access fee on the uncovered portion
  let odAccountId: string | null = null
  if (accessFee > 0) {
    const feeRef = `${reference}-ODFEE`
    if (isUuid(uid)) {
      let { data: account } = await supabase.from('overdraft_accounts')
        .select('id, outstanding_balance, total_drawn').eq('user_id', uid).eq('status', 'active').maybeSingle()
      if (!account) {
        const { data: created } = await supabase.from('overdraft_accounts').insert({
          user_id: uid, employee_email: emp.email, employee_name: emp.name,
          approved_limit: 50000, status: 'active', approved_by: 'SYSTEM_AUTO_EMPLOYEE_CHARGE',
          activation_fee_paid: true, auto_managed: true,
        }).select('id, outstanding_balance, total_drawn').single()
        account = created
      }
      if (account) {
        odAccountId = account.id
        const priorOut = Number(account.outstanding_balance || 0)
        const newOut = priorOut + overdraftPortion + accessFee
        await supabase.from('overdraft_accounts').update({
          outstanding_balance: newOut,
          total_drawn: Number(account.total_drawn || 0) + overdraftPortion,
          last_used_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq('id', account.id)
        await supabase.from('overdraft_transactions').insert([
          { account_id: account.id, user_id: uid, transaction_type: 'draw', amount: overdraftPortion,
            balance_after: priorOut + overdraftPortion, reference,
            metadata: { source: 'employee_charge', reason: reasonText, access_fee: accessFee } },
          { account_id: account.id, user_id: uid, transaction_type: 'fee', amount: accessFee,
            balance_after: newOut, reference: feeRef,
            metadata: { source: 'employee_charge', fee_rate: OD_FEE_RATE, draw_amount: overdraftPortion } },
        ])
      }
    }
    // Treasury trigger books this Loans & Overdrafts → Profits automatically.
    await supabase.from('ledger_entries').insert({
      user_id: uid,
      entry_type: 'FEE',
      amount: -accessFee,
      reference: feeRef,
      source_category: 'OVERDRAFT_FEE',
      metadata: {
        type: 'overdraft_access_fee',
        overdraft_account_id: odAccountId,
        fee_rate: OD_FEE_RATE,
        draw_amount: overdraftPortion,
        charge_reference: reference,
        employee_name: emp.name,
        employee_email: emp.email,
        bypass_treasury_check: true,
        description: `Overdraft access fee (2.75%) on ${ugx(overdraftPortion)} drawn for ${reasonLabel} charge`,
      },
    })
  }

  const newBalance = balBefore - amount - accessFee

  // 3) Notify — email + SMS
  const odLine = accessFee > 0
    ? `Your wallet could not fully cover this charge: ${ugx(overdraftPortion)} was drawn from your overdraft with a 2.75% access fee of ${ugx(accessFee)} added to your outstanding overdraft.`
    : ''
  const [mail, sms] = await Promise.all([
    supabase.functions.invoke('send-transactional-email', {
      body: {
        templateName: 'general-notification',
        recipientEmail: emp.email,
        idempotencyKey: `employee-charge-${reference}`,
        templateData: {
          subject: `${reasonLabel} Charge of ${ugx(amount)} Applied`,
          title: `${reasonLabel} Charge Applied`,
          recipientName: emp.name,
          message: [
            `A charge of ${ugx(amount)} has been deducted from your wallet.`,
            '',
            'Detail | Value',
            `Charge | ${reasonLabel}`,
            ...(note ? [`Note | ${note}`] : []),
            `Amount | ${ugx(amount)}`,
            ...(accessFee > 0 ? [`Overdraft drawn | ${ugx(overdraftPortion)}`, `Overdraft access fee (2.75%) | ${ugx(accessFee)}`] : []),
            `Date | ${day}`,
            `Reference | ${reference}`,
            `Applied by | ${actor.name || actorEmail}`,
            '',
            ...(odLine ? [odLine, ''] : []),
            'If you believe this was applied in error, contact HR or Administration.',
          ].join('\n'),
        },
      },
    }),
    emp.phone
      ? supabase.functions.invoke('send-sms', {
          headers: { Authorization: `Bearer ${serviceKey}` },
          body: {
            phone: emp.phone,
            message: `Dear ${emp.name}, a ${reasonLabel.toLowerCase()} charge of ${ugx(amount)} has been deducted from your wallet on ${day}.${accessFee > 0 ? ` Overdraft access fee ${ugx(accessFee)} applied.` : ''} Ref ${reference}. - Great Agro Coffee`,
            userName: emp.name,
            messageType: 'wallet_debit',
            recipientEmail: emp.email,
            idempotency_key: `employee-charge-sms-${reference}`,
          },
        })
      : Promise.resolve({ data: null, error: null } as any),
  ])

  return json({
    ok: true,
    reference,
    employee: emp.name,
    amount,
    reason: reasonText,
    balance_before: balBefore,
    overdraft_portion: overdraftPortion,
    access_fee: accessFee,
    new_balance: newBalance,
    email_status: mail.error ? 'failed' : (mail.data as any)?.email_status || 'sent',
    sms_status: !emp.phone ? 'no_phone' : (sms.error || (sms.data as any)?.success === false) ? 'failed' : 'sent',
  })
})
