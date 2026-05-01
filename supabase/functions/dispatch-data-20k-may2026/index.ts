import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { yoSendAirtime, normalizePhone } from '../_shared/yo-payments.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RECIPIENTS = [
  'musemawyclif@greatpearlcoffee.com',  // Wyclif
  'tatwanzire@greatpearlcoffee.com',    // Timothy
  'godwinmukobi@greatpearlcoffee.com',  // Godwin
  'bwambalemorjalia@greatpearlcoffee.com', // Morjalia
  'johnmasereka@greatpearlcoffee.com',  // John
  'bwambaledenis@greatpearlcoffee.com', // Denis
  'tumwinealex@greatpearlcoffee.com',   // Alex
  'nickscott@greatpearlcoffee.com',     // Kibaba
  'fauzakusa@greatpearlcoffee.com',     // me (Fauza)
]
const AMOUNT = 20000
const TYPE_LABEL = 'Data Allowance'
const ALLOWANCE_TYPE = 'data_allowance'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const now = new Date()
    const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    const results: any[] = []
    const sentPhones = new Set<string>()

    for (const email of RECIPIENTS) {
      try {
        const { data: emp } = await supabase
          .from('employees')
          .select('id, auth_user_id, name, phone, email')
          .eq('email', email)
          .maybeSingle()

        if (!emp || !emp.phone) {
          results.push({ email, status: 'skipped', reason: 'no employee/phone' })
          continue
        }

        const cleanPhone = normalizePhone(emp.phone)

        // Dedup: prevent double data send for same phone this month
        if (sentPhones.has(cleanPhone)) {
          results.push({ email, status: 'skipped', reason: 'dup phone in run' })
          continue
        }
        const { data: dataAlready } = await supabase
          .from('monthly_allowance_log')
          .select('id')
          .eq('employee_email', email)
          .eq('allowance_type', ALLOWANCE_TYPE)
          .eq('month_year', monthYear)
          .maybeSingle()
        if (dataAlready) {
          results.push({ email, status: 'skipped', reason: 'already sent this month' })
          sentPhones.add(cleanPhone)
          continue
        }

        const { data: unifiedId } = await supabase.rpc('get_unified_user_id', { user_email: email })
        const userId = unifiedId || emp.auth_user_id || emp.id
        const reference = `DATA_ALLOWANCE-${monthYear}-${emp.id}`

        // Yo Payments — send as airtime, but narrative says Data Allowance
        const yoResult = await yoSendAirtime({
          phone: cleanPhone,
          amount: AMOUNT,
          narrative: `Monthly Data Allowance ${monthYear} - Great Agro Coffee`,
        })

        const isPending22 = yoResult.statusMessage?.includes('-22') ||
          (yoResult.rawResponse || '').includes('<StatusCode>-22</StatusCode>')
        const yoOk = yoResult.success || isPending22

        if (!yoOk) {
          results.push({ email, name: emp.name, status: 'failed', error: yoResult.errorMessage })
          continue
        }
        sentPhones.add(cleanPhone)

        await supabase.from('ledger_entries').insert({
          user_id: String(userId),
          entry_type: 'PAYOUT',
          amount: AMOUNT,
          reference,
          metadata: {
            allowance_type: ALLOWANCE_TYPE,
            employee_name: emp.name,
            month_year: monthYear,
            yo_reference: yoResult.transactionRef || null,
            yo_status: isPending22 ? 'pending_approval' : 'success',
            disbursement_method: 'yo_airtime',
            phone: cleanPhone,
            description: `Monthly Data Allowance UGX ${AMOUNT} disbursed via Yo Payments to ${cleanPhone} (use to buy data bundle)`,
          },
          created_at: new Date().toISOString(),
        })

        // SMS
        try {
          const smsMessage = `Dear ${emp.name}, your monthly Data Allowance of UGX ${AMOUNT.toLocaleString()} has been sent to ${cleanPhone} via Yo Payments. Please use it to purchase a data bundle. - Great Agro Coffee`
          await supabase.functions.invoke('send-sms', {
            body: { phone: emp.phone, message: smsMessage, userName: emp.name, messageType: 'monthly_allowance', recipientEmail: email }
          })
        } catch (e) { console.error('SMS err', e) }

        // Email
        try {
          await supabase.functions.invoke('send-transactional-email', {
            body: {
              templateName: 'allowance-credited',
              recipientEmail: email,
              idempotencyKey: `data-allowance-${emp.id}-${monthYear}`,
              templateData: {
                employeeName: emp.name,
                allowanceType: TYPE_LABEL,
                amount: AMOUNT.toLocaleString(),
                month: monthYear,
                disbursementMethod: 'Yo Payments — to be used for data bundle purchase',
                phone: cleanPhone,
                yoReference: yoResult.transactionRef || 'N/A',
              },
            },
          })
        } catch (e) { console.error('Email err', e) }

        // In-app
        try {
          await supabase.from('notifications').insert({
            type: 'system',
            title: 'Data Allowance Sent',
            message: `Your monthly Data Allowance of UGX ${AMOUNT.toLocaleString()} has been sent to ${cleanPhone} via Yo Payments. Use it to buy a data bundle.`,
            priority: 'medium',
            target_user_id: emp.id,
            is_read: false,
          })
        } catch (e) { console.error('Notif err', e) }

        await supabase.from('monthly_allowance_log').insert({
          employee_email: email,
          employee_name: emp.name,
          allowance_type: ALLOWANCE_TYPE,
          amount: AMOUNT,
          ledger_reference: yoResult.transactionRef || reference,
          sms_sent: true,
          month_year: monthYear,
        })

        results.push({ email, name: emp.name, phone: cleanPhone, status: isPending22 ? 'pending_auth' : 'sent', ref: yoResult.transactionRef })
      } catch (err) {
        results.push({ email, status: 'error', error: (err as Error).message })
      }
    }

    return new Response(JSON.stringify({ success: true, month_year: monthYear, results }, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})