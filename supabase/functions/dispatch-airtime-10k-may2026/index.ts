import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { yoSendAirtime, normalizePhone } from '../_shared/yo-payments.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// One-off: send UGX 10,000 airtime to every active airtime_allowance recipient
// for May 2026, without modifying the configured amounts. Logs to
// monthly_allowance_log so the regular monthly cron will skip these users.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const monthYear = '2026-05'
    const overrideAmount = 10000

    const { data: allowances, error } = await supabase
      .from('monthly_allowances')
      .select('*')
      .eq('is_active', true)
      .eq('allowance_type', 'airtime_allowance')

    if (error) throw error

    let processed = 0, yoSent = 0, yoFailed = 0, skipped = 0
    const errors: string[] = []
    const results: any[] = []

    for (const allowance of allowances || []) {
      try {
        const { data: existing } = await supabase
          .from('monthly_allowance_log')
          .select('id')
          .eq('employee_email', allowance.employee_email)
          .eq('allowance_type', 'airtime_allowance')
          .eq('month_year', monthYear)
          .maybeSingle()
        if (existing) { skipped++; continue }

        const { data: employee } = await supabase
          .from('employees')
          .select('id, auth_user_id, phone, email')
          .eq('email', allowance.employee_email)
          .eq('status', 'Active')
          .maybeSingle()
        if (!employee || !employee.phone) { skipped++; continue }

        const { data: unifiedId } = await supabase.rpc('get_unified_user_id', {
          user_email: allowance.employee_email,
        })
        const userId = unifiedId || employee.auth_user_id || employee.id

        const cleanPhone = normalizePhone(employee.phone)
        const reference = `AIRTIME-10K-${monthYear}-${employee.id}`

        const yoResult = await yoSendAirtime({
          phone: cleanPhone,
          amount: overrideAmount,
          narrative: `Monthly Airtime Allowance ${monthYear} - Great Agro Coffee`,
        })

        const isPending22 = yoResult.statusMessage?.includes('-22') ||
          (yoResult.rawResponse || '').includes('<StatusCode>-22</StatusCode>')
        const yoOk = yoResult.success || isPending22

        if (!yoOk) {
          yoFailed++
          errors.push(`${allowance.employee_name}: ${yoResult.errorMessage || 'failed'}`)
          results.push({ name: allowance.employee_name, phone: cleanPhone, ok: false, err: yoResult.errorMessage })
          continue
        }
        yoSent++

        await supabase.from('ledger_entries').insert({
          user_id: String(userId),
          entry_type: 'PAYOUT',
          amount: overrideAmount,
          reference,
          metadata: {
            allowance_type: 'airtime_allowance',
            employee_name: allowance.employee_name,
            month_year: monthYear,
            yo_reference: yoResult.transactionRef || null,
            yo_status: isPending22 ? 'pending_approval' : 'success',
            disbursement_method: 'yo_airtime',
            phone: cleanPhone,
            override_amount: true,
            description: `Monthly Airtime Allowance (10k override) sent to ${cleanPhone}`,
          },
          created_at: new Date().toISOString(),
        })

        // Log so the regular monthly cron skips these users this month
        await supabase.from('monthly_allowance_log').insert({
          employee_email: allowance.employee_email,
          employee_name: allowance.employee_name,
          allowance_type: 'airtime_allowance',
          amount: overrideAmount,
          ledger_reference: yoResult.transactionRef || reference,
          sms_sent: false,
          month_year: monthYear,
        })

        // Notification email (best-effort)
        try {
          await supabase.functions.invoke('send-transactional-email', {
            body: {
              templateName: 'allowance-credited',
              recipientEmail: allowance.employee_email,
              idempotencyKey: `airtime-10k-${allowance.id}-${monthYear}`,
              templateData: {
                employeeName: allowance.employee_name,
                allowanceType: 'Airtime Allowance',
                amount: overrideAmount.toLocaleString(),
                month: monthYear,
                disbursementMethod: 'Airtime to phone',
                phone: cleanPhone,
                yoReference: yoResult.transactionRef || 'N/A',
              },
            },
          })
        } catch (_) {}

        processed++
        results.push({ name: allowance.employee_name, phone: cleanPhone, ok: true, ref: yoResult.transactionRef })
      } catch (err) {
        errors.push(`${allowance.employee_name}: ${(err as Error).message}`)
      }
    }

    return new Response(JSON.stringify({
      success: true,
      month_year: monthYear,
      override_amount: overrideAmount,
      total: allowances?.length || 0,
      processed, yo_sent: yoSent, yo_failed: yoFailed, skipped,
      results,
      errors: errors.length ? errors : undefined,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})