import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { yoSendAirtime, normalizePhone } from '../_shared/yo-payments.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// One-off: send UGX 10,000 airtime to Masika Recheal at 0750017013
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const email = 'masikarecheal@greatpearlcoffee.com'
    const employeeId = '143e74f9-a5d6-49ad-9e75-7771009453a1'
    const targetPhone = '0750017013'
    const amount = 10000
    const monthYear = new Date().toISOString().slice(0, 7)

    const { data: unifiedId } = await supabase.rpc('get_unified_user_id', { user_email: email })
    const userId = unifiedId || '9355a7e6-8112-4598-81cd-d2897dda1fe0'

    const cleanPhone = normalizePhone(targetPhone)
    const reference = `AIRTIME-RECHEAL-${monthYear}-${Date.now()}`

    const yoResult = await yoSendAirtime({
      phone: cleanPhone,
      amount,
      narrative: `Airtime Allowance ${monthYear} - Great Agro Coffee`,
    })
    const isPending22 = yoResult.statusMessage?.includes('-22') ||
      (yoResult.rawResponse || '').includes('<StatusCode>-22</StatusCode>')
    const yoOk = yoResult.success || isPending22

    if (!yoOk) {
      return new Response(JSON.stringify({
        success: false, phone: cleanPhone,
        error: yoResult.errorMessage || 'Yo airtime failed', raw: yoResult.rawResponse,
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    await supabase.from('ledger_entries').insert({
      user_id: String(userId),
      entry_type: 'PAYOUT',
      amount,
      reference,
      metadata: {
        allowance_type: 'airtime_allowance',
        employee_name: 'Masika Recheal',
        month_year: monthYear,
        yo_reference: yoResult.transactionRef || null,
        yo_status: isPending22 ? 'pending_approval' : 'success',
        disbursement_method: 'yo_airtime',
        phone: cleanPhone,
        description: `Airtime Allowance sent to ${cleanPhone}`,
      },
      created_at: new Date().toISOString(),
    })

    try {
      await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'allowance-credited',
          recipientEmail: email,
          idempotencyKey: `airtime-recheal-${employeeId}-${monthYear}-${Date.now()}`,
          templateData: {
            employeeName: 'Masika Recheal',
            allowanceType: 'Airtime Allowance',
            amount: amount.toLocaleString(),
            month: monthYear,
            disbursementMethod: 'Airtime to phone',
            phone: cleanPhone,
            yoReference: yoResult.transactionRef || 'N/A',
          },
        },
      })
    } catch (_) {}

    return new Response(JSON.stringify({
      success: true, phone: cleanPhone, amount,
      yo_reference: yoResult.transactionRef, pending_approval: isPending22,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})