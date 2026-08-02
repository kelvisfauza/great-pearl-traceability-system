import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { yoSendAirtime, normalizePhone } from '../_shared/yo-payments.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// One-off: UGX 5,000 airtime each to the two newly enrolled staff (Aug 2026)
const TARGETS = [
  { name: 'Niwagaba Gadaffi', email: 'nuwagabagadaffi@greatpearlcoffee.com', phone: '0779448188' },
  { name: 'Rubambura Kakuhi Onesmus', email: 'onesmusrubambura@greatpearlcoffee.com', phone: '0778479944' },
]
const AMOUNT = 5000

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
  const monthYear = new Date().toISOString().slice(0, 7)
  const results: any[] = []

  for (const t of TARGETS) {
    try {
      const cleanPhone = normalizePhone(t.phone)
      const reference = `AIRTIME-${t.email.split('@')[0].toUpperCase()}-${monthYear}-${Date.now()}`
      const yoResult = await yoSendAirtime({
        phone: cleanPhone,
        amount: AMOUNT,
        narrative: `Airtime Allowance ${monthYear} - Great Agro Coffee`,
      })
      const isPending22 = yoResult.statusMessage?.includes('-22') ||
        (yoResult.rawResponse || '').includes('<StatusCode>-22</StatusCode>')
      const yoOk = yoResult.success || isPending22

      if (!yoOk) {
        results.push({ name: t.name, phone: cleanPhone, success: false, error: yoResult.errorMessage || 'Yo airtime failed' })
        continue
      }

      const { data: unifiedId } = await supabase.rpc('get_unified_user_id', { user_email: t.email })
      if (unifiedId) {
        await supabase.from('ledger_entries').insert({
          user_id: String(unifiedId),
          entry_type: 'PAYOUT',
          amount: AMOUNT,
          reference,
          metadata: {
            allowance_type: 'airtime_allowance',
            employee_name: t.name,
            month_year: monthYear,
            yo_reference: yoResult.transactionRef || null,
            yo_status: isPending22 ? 'pending_approval' : 'success',
            disbursement_method: 'yo_airtime',
            phone: cleanPhone,
            description: `Airtime Allowance sent to ${cleanPhone}`,
          },
          created_at: new Date().toISOString(),
        })
      }

      try {
        await supabase.from('monthly_allowance_log').insert({
          employee_email: t.email,
          employee_name: t.name,
          allowance_type: 'airtime_allowance',
          amount: AMOUNT,
          month_year: monthYear,
          status: isPending22 ? 'pending' : 'paid',
        })
      } catch (_) {}

      try {
        await supabase.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'allowance-credited',
            recipientEmail: t.email,
            idempotencyKey: `airtime-${t.email}-${monthYear}-${Date.now()}`,
            templateData: {
              employeeName: t.name,
              allowanceType: 'Airtime Allowance',
              amount: AMOUNT.toLocaleString(),
              month: monthYear,
              disbursementMethod: 'Airtime to phone',
              phone: cleanPhone,
              yoReference: yoResult.transactionRef || 'N/A',
            },
          },
        })
      } catch (_) {}

      results.push({ name: t.name, phone: cleanPhone, success: true, pending_approval: isPending22, yo_reference: yoResult.transactionRef || null })
    } catch (e) {
      results.push({ name: t.name, success: false, error: (e as Error).message })
    }
  }

  return new Response(JSON.stringify({ ok: true, amount: AMOUNT, results }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
