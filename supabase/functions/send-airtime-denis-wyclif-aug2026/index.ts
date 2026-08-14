import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { yoSendAirtime, normalizePhone } from '../_shared/yo-payments.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// One-off: monthly airtime allowance (UGX 10,000) for Denis & Wyclif — Aug 2026
const TARGETS = [
  { name: 'bwambale denis', email: 'bwambaledenis@greatpearlcoffee.com' },
  { name: 'Musema Wyclif', email: 'musemawyclif@greatpearlcoffee.com' },
]
const AMOUNT = 20000
const MONTH = '2026-08'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
  const results: any[] = []

  for (const t of TARGETS) {
    try {
      const { data: existing } = await supabase
        .from('monthly_allowance_log')
        .select('id')
        .eq('employee_email', t.email)
        .eq('allowance_type', 'airtime_allowance')
        .eq('month_year', MONTH)
        .maybeSingle()
      if (existing) { results.push({ email: t.email, status: 'already_sent' }); continue }

      const { data: emp } = await supabase
        .from('employees')
        .select('id, auth_user_id, name, phone, status, disabled')
        .eq('email', t.email)
        .maybeSingle()
      if (!emp || !emp.phone || emp.status !== 'Active' || emp.disabled === true) {
        results.push({ email: t.email, status: 'skipped_inactive_or_no_phone' }); continue
      }

      const cleanPhone = normalizePhone(emp.phone)
      const reference = `AIRTIME-${MONTH}-${emp.id}`
      const yo = await yoSendAirtime({
        phone: cleanPhone,
        amount: AMOUNT,
        narrative: `Monthly Airtime Allowance ${MONTH} - ${emp.name} - Great Agro Coffee`,
      })
      const isPending22 = yo.statusMessage?.includes('-22') ||
        (yo.rawResponse || '').includes('<StatusCode>-22</StatusCode>')
      if (!(yo.success || isPending22)) {
        results.push({ email: t.email, status: 'yo_failed', error: yo.errorMessage }); continue
      }

      const { data: unifiedId } = await supabase.rpc('get_unified_user_id', { user_email: t.email })
      const userId = unifiedId || emp.auth_user_id || emp.id

      await supabase.from('ledger_entries').insert({
        user_id: String(userId),
        entry_type: 'PAYOUT',
        amount: AMOUNT,
        reference,
        metadata: {
          allowance_type: 'airtime_allowance',
          employee_name: emp.name,
          month_year: MONTH,
          yo_reference: yo.transactionRef || null,
          yo_status: isPending22 ? 'pending_approval' : 'success',
          disbursement_method: 'yo_airtime',
          phone: cleanPhone,
          description: `Monthly Airtime Allowance ${MONTH} sent to ${cleanPhone}`,
        },
        created_at: new Date().toISOString(),
      })

      await supabase.from('monthly_allowance_log').insert({
        employee_email: t.email,
        employee_name: emp.name,
        allowance_type: 'airtime_allowance',
        amount: AMOUNT,
        ledger_reference: yo.transactionRef || reference,
        sms_sent: true,
        month_year: MONTH,
      })

      try {
        await supabase.functions.invoke('send-sms', {
          body: {
            phone: emp.phone,
            message: `Dear ${emp.name}, your monthly Airtime Allowance of UGX ${AMOUNT.toLocaleString()} has been sent to ${cleanPhone}. - Great Agro Coffee`,
            userName: emp.name,
            messageType: 'monthly_allowance',
            recipientEmail: t.email,
          },
        })
      } catch (_) {}

      try {
        await supabase.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'allowance-credited',
            recipientEmail: t.email,
            idempotencyKey: `airtime-${emp.id}-${MONTH}`,
            templateData: {
              employeeName: emp.name,
              allowanceType: 'Airtime Allowance',
              amount: AMOUNT.toLocaleString(),
              month: MONTH,
              disbursementMethod: 'Airtime to phone',
              phone: cleanPhone,
              yoReference: yo.transactionRef || 'N/A',
            },
          },
        })
      } catch (_) {}

      results.push({ email: t.email, phone: cleanPhone, status: isPending22 ? 'pending_auth' : 'sent', yoRef: yo.transactionRef })
    } catch (e) {
      results.push({ email: t.email, status: 'error', error: (e as Error).message })
    }
  }

  return new Response(JSON.stringify({ ok: true, month: MONTH, results }, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
