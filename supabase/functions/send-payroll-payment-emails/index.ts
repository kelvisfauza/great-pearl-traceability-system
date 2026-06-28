import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const money = (value: unknown) => Number(value || 0).toLocaleString()
const isEmail = (value: unknown) => typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const body = await req.json().catch(() => ({}))
    const month = body.month || new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })
    const paymentIds: string[] = Array.isArray(body.paymentIds) ? body.paymentIds : []
    const resend = body.resend === true

    let query = supabase
      .from('employee_salary_payments')
      .select('*')
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })

    if (paymentIds.length > 0) {
      query = query.in('id', paymentIds)
    } else {
      query = query.eq('payment_month', month).limit(100)
    }

    const { data: payments, error } = await query
    if (error) throw error

    const sent: any[] = []
    const skipped: any[] = []
    const failed: any[] = []

    for (const payment of payments || []) {
      if (!isEmail(payment.employee_email)) {
        skipped.push({ employee: payment.employee_name, reason: 'invalid email', email: payment.employee_email })
        continue
      }

      const idempotencyKey = `salary-paid-${payment.employee_email}-${payment.payment_month || month}-${payment.id}`
      if (!resend) {
        const { data: existing } = await supabase
          .from('sent_emails_log')
          .select('id,status')
          .eq('template_name', 'salary-credited')
          .eq('recipient_email', payment.employee_email)
          .eq('idempotency_key', idempotencyKey)
          .eq('status', 'sent')
          .maybeSingle()

        if (existing) {
          skipped.push({ employee: payment.employee_name, reason: 'already sent', email: payment.employee_email })
          continue
        }
      }

      const grossSalary = Number(payment.gross_salary || payment.salary_amount || 0)
      const nssfEmployee = Number(payment.nssf_employee || 0)
      const paye = Number(payment.paye || 0)
      const advanceDeduction = Number(payment.advance_deduction || 0)
      const timeDeduction = Number(payment.time_deduction || 0)
      const walletCredited = Number(payment.net_salary || 0)
      const totalDeductions = nssfEmployee + paye + advanceDeduction + timeDeduction

      const { error: sendError } = await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'salary-credited',
          recipientEmail: payment.employee_email,
          idempotencyKey,
          templateData: {
            employeeName: payment.employee_name,
            month: payment.payment_month || month,
            grossSalary: money(grossSalary),
            advanceDeduction: money(advanceDeduction + timeDeduction),
            loanDeduction: '0',
            netSalary: money(walletCredited),
            walletCredited: money(walletCredited),
            hasDeductions: totalDeductions > 0,
            department: payment.department || '',
            transactionId: payment.transaction_id || payment.disbursement_reference || `SAL-${payment.id}`,
            payslipUrl: '',
            nssfEmployee: money(nssfEmployee),
            nssfEmployer: money(payment.nssf_employer || 0),
            paye: money(paye),
            totalDeductions: money(totalDeductions),
          },
        },
      })

      if (sendError) {
        failed.push({ employee: payment.employee_name, email: payment.employee_email, error: sendError.message })
      } else {
        sent.push({ employee: payment.employee_name, email: payment.employee_email })
      }
    }

    return new Response(JSON.stringify({ ok: true, month, checked: payments?.length || 0, sent, skipped, failed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('send-payroll-payment-emails error:', error)
    return new Response(JSON.stringify({ ok: false, error: String(error) }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})