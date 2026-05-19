import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { yoSendAirtime, normalizePhone } from '../_shared/yo-payments.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// One-off: re-send UGX 10,000 airtime to Sserunkuma Taufiq for May 2026
// (original dispatch did not reach him). Also emails him a notification.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const email = 'sserunkumataufiq@greatpearlcoffee.com'
    const monthYear = '2026-05'
    const amount = 10000

    const { data: employee } = await supabase
      .from('employees')
      .select('id, auth_user_id, phone, email, name')
      .eq('email', email)
      .maybeSingle()

    if (!employee || !employee.phone) {
      return new Response(JSON.stringify({ success: false, error: 'Employee or phone not found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: unifiedId } = await supabase.rpc('get_unified_user_id', { user_email: email })
    const userId = unifiedId || employee.auth_user_id || employee.id

    const cleanPhone = normalizePhone(employee.phone)
    const reference = `AIRTIME-10K-RETRY-${monthYear}-${employee.id}-${Date.now()}`

    const yoResult = await yoSendAirtime({
      phone: cleanPhone,
      amount,
      narrative: `Monthly Airtime Allowance ${monthYear} - Great Agro Coffee`,
    })

    const isPending22 = yoResult.statusMessage?.includes('-22') ||
      (yoResult.rawResponse || '').includes('<StatusCode>-22</StatusCode>')
    const yoOk = yoResult.success || isPending22

    if (!yoOk) {
      return new Response(JSON.stringify({
        success: false,
        phone: cleanPhone,
        error: yoResult.errorMessage || 'Yo airtime failed',
        raw: yoResult.rawResponse,
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    await supabase.from('ledger_entries').insert({
      user_id: String(userId),
      entry_type: 'PAYOUT',
      amount,
      reference,
      metadata: {
        allowance_type: 'airtime_allowance',
        employee_name: employee.name,
        month_year: monthYear,
        yo_reference: yoResult.transactionRef || null,
        yo_status: isPending22 ? 'pending_approval' : 'success',
        disbursement_method: 'yo_airtime',
        phone: cleanPhone,
        retry: true,
        description: `Monthly Airtime Allowance (manual retry) sent to ${cleanPhone}`,
      },
      created_at: new Date().toISOString(),
    })

    // Email notification
    try {
      await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'allowance-credited',
          recipientEmail: email,
          idempotencyKey: `airtime-retry-${employee.id}-${monthYear}`,
          templateData: {
            employeeName: employee.name,
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
      success: true,
      phone: cleanPhone,
      yo_reference: yoResult.transactionRef,
      pending_approval: isPending22,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})