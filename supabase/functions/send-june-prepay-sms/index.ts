import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TARGET_MONTH = '2026-06'
const REQUEST_ID = '44964ebc-09bc-4980-a571-674728258f99'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
  const yoolaKey = Deno.env.get('YOOLA_SMS_API_KEY')
  if (!yoolaKey) {
    return new Response(JSON.stringify({ ok: false, error: 'YOOLA_SMS_API_KEY missing' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Pull recipients from the prepay log (airtime rows only — skip the data-included marker rows)
  const { data: logs, error } = await supabase
    .from('monthly_allowance_log')
    .select('employee_email, employee_name, amount, allowance_type, ledger_reference, sms_sent')
    .eq('month_year', TARGET_MONTH)
    .eq('ledger_reference', `PREPAY-${REQUEST_ID}`)
    .eq('allowance_type', 'airtime_allowance')

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const results: any[] = []
  let sent = 0, failed = 0, skipped = 0

  for (const row of logs || []) {
    if (row.sms_sent) { skipped++; results.push({ email: row.employee_email, status: 'already_sent' }); continue }

    const { data: emp } = await supabase
      .from('employees')
      .select('phone, name')
      .eq('email', row.employee_email)
      .maybeSingle()

    const phone = emp?.phone
    if (!phone) { skipped++; results.push({ email: row.employee_email, status: 'no_phone' }); continue }

    let smsPhone = String(phone).replace(/\D/g, '')
    if (smsPhone.startsWith('0')) smsPhone = '+256' + smsPhone.slice(1)
    else if (smsPhone.startsWith('256')) smsPhone = '+' + smsPhone
    else if (!smsPhone.startsWith('+')) smsPhone = '+256' + smsPhone

    const name = emp?.name || row.employee_name
    const msg = `Dear ${name}, your JUNE 2026 airtime & data allowance of UGX ${Number(row.amount).toLocaleString()} has been sent as AIRTIME to ${smsPhone} (prepaid early). This replaces your June 1 allowance. - Great Agro Coffee`

    try {
      const resp = await fetch('https://yoolasms.com/api/v1/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: smsPhone, message: msg, api_key: yoolaKey }),
      })
      const text = await resp.text()
      if (resp.ok) {
        sent++
        await supabase.from('monthly_allowance_log')
          .update({ sms_sent: true })
          .eq('employee_email', row.employee_email)
          .eq('month_year', TARGET_MONTH)
          .eq('ledger_reference', `PREPAY-${REQUEST_ID}`)
        results.push({ email: row.employee_email, phone: smsPhone, status: 'sent' })
      } else {
        failed++
        results.push({ email: row.employee_email, status: 'failed', http: resp.status, body: text })
      }
    } catch (e) {
      failed++
      results.push({ email: row.employee_email, status: 'error', error: (e as Error).message })
    }
  }

  return new Response(JSON.stringify({ ok: true, sent, failed, skipped, results }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})