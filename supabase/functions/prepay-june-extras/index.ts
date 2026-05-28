import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { yoSendAirtime, normalizePhone } from '../_shared/yo-payments.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TARGET_MONTH = '2026-06'
const REQUEST_ID = '44964ebc-09bc-4980-a571-674728258f99'

const RECIPIENTS = [
  { email: 'masikarecheal@greatpearlcoffee.com', amount: 10000 },
  { email: 'sserunkumataufiq@greatpearlcoffee.com', amount: 5000 },
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
  const yoolaKey = Deno.env.get('YOOLA_SMS_API_KEY')

  const results: any[] = []

  for (const r of RECIPIENTS) {
    // Skip if already paid for June
    const { data: existing } = await supabase
      .from('monthly_allowance_log')
      .select('id')
      .eq('employee_email', r.email)
      .eq('month_year', TARGET_MONTH)
      .eq('allowance_type', 'airtime_allowance')
      .limit(1)
      .maybeSingle()
    if (existing) { results.push({ email: r.email, status: 'already_paid' }); continue }

    const { data: emp } = await supabase
      .from('employees')
      .select('id, auth_user_id, phone, name, disabled, status')
      .eq('email', r.email)
      .maybeSingle()

    if (!emp || emp.status !== 'Active' || emp.disabled === true || !emp.phone) {
      results.push({ email: r.email, status: 'skipped_inactive_or_no_phone' }); continue
    }

    const cleanPhone = normalizePhone(emp.phone)
    const yo = await yoSendAirtime({
      phone: cleanPhone,
      amount: r.amount,
      narrative: `June 2026 Airtime - ${emp.name} - Great Agro Coffee`,
    })
    const isPending22 = yo.statusMessage?.includes('-22') ||
      (yo.rawResponse || '').includes('<StatusCode>-22</StatusCode>')
    const yoOk = yo.success || isPending22

    if (!yoOk) {
      results.push({ email: r.email, status: 'yo_failed', error: yo.errorMessage })
      continue
    }

    const { data: unifiedId } = await supabase.rpc('get_unified_user_id', { user_email: r.email })
    const userId = unifiedId || emp.auth_user_id || emp.id

    await supabase.from('ledger_entries').insert({
      user_id: String(userId),
      entry_type: 'PAYOUT',
      amount: r.amount,
      reference: `PREPAY-JUNE2026-${emp.id}-${Date.now()}`,
      metadata: {
        allowance_type: 'airtime_data_prepayment',
        employee_name: emp.name,
        month_year: TARGET_MONTH,
        yo_reference: yo.transactionRef || null,
        yo_status: isPending22 ? 'pending_approval' : 'success',
        disbursement_method: 'yo_airtime',
        phone: cleanPhone,
        approval_request_id: REQUEST_ID,
        description: `June 2026 airtime prepayment (extra) UGX ${r.amount} to ${cleanPhone}`,
      },
    })

    await supabase.from('monthly_allowance_log').insert([
      {
        employee_email: r.email,
        employee_name: emp.name,
        allowance_type: 'airtime_allowance',
        amount: r.amount,
        ledger_reference: `PREPAY-${REQUEST_ID}-extra`,
        sms_sent: false,
        month_year: TARGET_MONTH,
      },
    ])

    // SMS via Yoola direct
    let smsStatus = 'skipped'
    if (yoolaKey) {
      let smsPhone = String(emp.phone).replace(/\D/g, '')
      if (smsPhone.startsWith('0')) smsPhone = '+256' + smsPhone.slice(1)
      else if (smsPhone.startsWith('256')) smsPhone = '+' + smsPhone
      else if (!smsPhone.startsWith('+')) smsPhone = '+256' + smsPhone
      const msg = `Dear ${emp.name}, your JUNE 2026 airtime & data allowance of UGX ${r.amount.toLocaleString()} has been sent as AIRTIME to ${smsPhone} (prepaid early). This replaces your June 1 allowance. - Great Agro Coffee`
      try {
        const resp = await fetch('https://yoolasms.com/api/v1/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: smsPhone, message: msg, api_key: yoolaKey }),
        })
        smsStatus = resp.ok ? 'sent' : `failed_${resp.status}`
        if (resp.ok) {
          await supabase.from('monthly_allowance_log')
            .update({ sms_sent: true })
            .eq('employee_email', r.email)
            .eq('month_year', TARGET_MONTH)
            .eq('ledger_reference', `PREPAY-${REQUEST_ID}-extra`)
        }
      } catch (e) { smsStatus = `error_${(e as Error).message}` }
    }

    results.push({ email: r.email, amount: r.amount, status: 'sent', yoRef: yo.transactionRef, smsStatus })
  }

  return new Response(JSON.stringify({ ok: true, results }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})