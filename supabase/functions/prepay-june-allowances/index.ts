import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { yoSendAirtime, normalizePhone } from '../_shared/yo-payments.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Priority tier — UGX 20,000 each
const PRIORITY_EMAILS = new Set([
  'bwambaledenis@greatpearlcoffee.com',
  'tatwanzire@greatpearlcoffee.com',
  'musemawyclif@greatpearlcoffee.com',
  'fauzakusa@greatpearlcoffee.com',
])

const TARGET_MONTH = '2026-06'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const body = await req.json().catch(() => ({}))
    const requestId: string | undefined = body?.requestId
    if (!requestId) {
      return new Response(JSON.stringify({ ok: false, error: 'requestId required' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify the approval request is actually approved
    const { data: appReq } = await supabase
      .from('approval_requests')
      .select('id, type, status, approval_stage, details')
      .eq('id', requestId)
      .maybeSingle()

    if (!appReq || appReq.type !== 'Monthly Allowance Prepayment' || appReq.status !== 'Approved') {
      return new Response(JSON.stringify({ ok: false, error: 'Approval request not approved or wrong type' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Optional exclusion list from approval details
    let details: any = appReq.details
    if (typeof details === 'string') { try { details = JSON.parse(details) } catch { details = {} } }
    const excludedEmails = new Set<string>(
      (Array.isArray(details?.excluded_emails) ? details.excluded_emails : [])
        .map((e: string) => String(e).toLowerCase())
    )

    // Per-email idempotency is enforced inside the loop, so reruns
    // safely retry only recipients that have not yet been processed.

    // Build recipient list from active monthly_allowances (any row qualifies the employee)
    const { data: configs } = await supabase
      .from('monthly_allowances')
      .select('employee_email, employee_name')
      .eq('is_active', true)

    const uniqueEmails = new Map<string, string>()
    for (const c of configs || []) {
      if (!uniqueEmails.has(c.employee_email)) uniqueEmails.set(c.employee_email, c.employee_name)
    }

    const results: any[] = []
    let yoSent = 0, yoFailed = 0, skipped = 0
    const sentPhones = new Set<string>()

    for (const [email, name] of uniqueEmails) {
      if (excludedEmails.has(email.toLowerCase())) { skipped++; results.push({ email, status: 'skipped_excluded' }); continue }
      const amount = PRIORITY_EMAILS.has(email.toLowerCase()) ? 20000 : 10000

      // Skip if already credited for June via cron or prior run
      const { data: existing } = await supabase
        .from('monthly_allowance_log')
        .select('id')
        .eq('employee_email', email)
        .eq('month_year', TARGET_MONTH)
        .limit(1)
        .maybeSingle()
      if (existing) { skipped++; results.push({ email, status: 'skipped_already_paid' }); continue }

      const { data: employee } = await supabase
        .from('employees')
        .select('id, auth_user_id, phone, disabled, status')
        .eq('email', email)
        .maybeSingle()

      if (!employee || employee.status !== 'Active' || employee.disabled === true) {
        skipped++; results.push({ email, status: 'skipped_inactive_or_disabled' }); continue
      }
      if (!employee.phone) { skipped++; results.push({ email, status: 'skipped_no_phone' }); continue }

      const cleanPhone = normalizePhone(employee.phone)
      if (sentPhones.has(cleanPhone)) { skipped++; continue }

      const yoResult = await yoSendAirtime({
        phone: cleanPhone,
        amount,
        narrative: `June 2026 Airtime & Data Prepayment - Great Agro Coffee`,
      })
      const isPending22 = yoResult.statusMessage?.includes('-22') ||
        (yoResult.rawResponse || '').includes('<StatusCode>-22</StatusCode>')
      const yoOk = yoResult.success || isPending22

      if (!yoOk) {
        yoFailed++
        results.push({ email, status: 'yo_failed', error: yoResult.errorMessage })
        continue
      }
      yoSent++
      sentPhones.add(cleanPhone)

      const { data: unifiedId } = await supabase.rpc('get_unified_user_id', { user_email: email })
      const userId = unifiedId || employee.auth_user_id || employee.id

      // Ledger PAYOUT (no wallet effect)
      await supabase.from('ledger_entries').insert({
        user_id: String(userId),
        entry_type: 'PAYOUT',
        amount,
        reference: `PREPAY-JUNE2026-${employee.id}-${Date.now()}`,
        metadata: {
          allowance_type: 'airtime_data_prepayment',
          employee_name: name,
          month_year: TARGET_MONTH,
          yo_reference: yoResult.transactionRef || null,
          yo_status: isPending22 ? 'pending_approval' : 'success',
          disbursement_method: 'yo_airtime',
          phone: cleanPhone,
          approval_request_id: requestId,
          description: `June 2026 airtime & data prepayment sent as airtime UGX ${amount} to ${cleanPhone}`,
        },
      })

      // Mark June as processed so cron skips
      await supabase.from('monthly_allowance_log').insert([
        {
          employee_email: email,
          employee_name: name,
          allowance_type: 'airtime_allowance',
          amount,
          ledger_reference: `PREPAY-${requestId}`,
          sms_sent: false,
          month_year: TARGET_MONTH,
        },
        {
          employee_email: email,
          employee_name: name,
          allowance_type: 'data_allowance',
          amount: 0,
          ledger_reference: `PREPAY-${requestId}-data-included`,
          sms_sent: false,
          month_year: TARGET_MONTH,
        },
      ])

      // SMS
      try {
        const smsMsg = `Dear ${name}, your JUNE 2026 airtime & data allowance of UGX ${amount.toLocaleString()} has been sent as airtime to ${cleanPhone} (prepaid early). This replaces your June 1 allowance. - Great Agro Coffee`
        await supabase.functions.invoke('send-sms', {
          body: {
            phone: employee.phone,
            message: smsMsg,
            userName: name,
            messageType: 'monthly_allowance',
            recipientEmail: email,
          },
        })
      } catch (_) { /* non-blocking */ }

      // Email
      try {
        await supabase.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'allowance-credited',
            recipientEmail: email,
            idempotencyKey: `prepay-june-${email}`,
            templateData: {
              employeeName: name,
              allowanceType: 'June 2026 Airtime & Data (prepaid)',
              amount: amount.toLocaleString(),
              month: TARGET_MONTH,
              disbursementMethod: 'Airtime to phone',
              phone: cleanPhone,
              yoReference: yoResult.transactionRef || 'N/A',
            },
          },
        })
      } catch (_) { /* non-blocking */ }

      results.push({ email, amount, status: 'sent', yoRef: yoResult.transactionRef })
    }

    return new Response(JSON.stringify({
      ok: true,
      month: TARGET_MONTH,
      yoSent, yoFailed, skipped,
      totalUgx: results.filter(r => r.status === 'sent').reduce((s, r) => s + (r.amount || 0), 0),
      results,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})