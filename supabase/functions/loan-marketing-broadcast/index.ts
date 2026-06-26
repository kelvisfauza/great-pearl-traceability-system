import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BRAND = 'GREAT AGRO COFFEE'
const LOGIN_URL = 'https://www.greatagrocoffeesystem.site'

function fmt(n: number) { return Math.round(n).toLocaleString() }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    const body = await req.json().catch(() => ({}))
    const dryRun = body?.dryRun === true

    // Active employees only
    const { data: employees, error: empErr } = await supabase
      .from('employees')
      .select('id, name, email, phone, salary, join_date, status, disabled')
      .eq('status', 'Active')
      .neq('disabled', true)
    if (empErr) throw empErr

    // Active loans (for top-up eligibility) — must be repaid >= 50%
    const { data: activeLoans } = await supabase
      .from('loans')
      .select('id, employee_email, employee_name, loan_amount, paid_amount, remaining_balance, status, original_loan_amount')
      .eq('status', 'active')

    const loanByEmail = new Map<string, any>()
    for (const l of activeLoans || []) {
      if (l.employee_email) loanByEmail.set(l.employee_email.toLowerCase(), l)
    }

    // Active overdraft accounts
    const { data: odAccounts } = await supabase
      .from('overdraft_accounts')
      .select('employee_email, approved_limit, outstanding_balance, status, frozen')
      .eq('status', 'active')
    const odByEmail = new Map<string, any>()
    for (const o of odAccounts || []) {
      if (o.employee_email && !o.frozen) odByEmail.set(o.employee_email.toLowerCase(), o)
    }

    // Overdraft eligibility (for people without active OD)
    const { data: odElig } = await supabase
      .from('overdraft_eligibility')
      .select('employee_email, computed_limit')
    const odEligByEmail = new Map<string, number>()
    for (const e of odElig || []) {
      if (e.employee_email) odEligByEmail.set(e.employee_email.toLowerCase(), Number(e.computed_limit || 0))
    }

    let smsSent = 0, emailSent = 0, skipped = 0
    const results: any[] = []

    for (const emp of employees || []) {
      if (!emp.email || !emp.phone) { skipped++; continue }
      const key = emp.email.toLowerCase()
      const salary = Number(emp.salary || 0)
      const join = emp.join_date ? new Date(emp.join_date) : null
      const tenureMonths = join ? Math.max(0, Math.floor((Date.now() - join.getTime()) / (1000 * 60 * 60 * 24 * 30))) : 0
      const multiplier = tenureMonths >= 3 ? 2 : 1
      const maxLoan = Math.max(0, salary * multiplier)

      const existingLoan = loanByEmail.get(key)
      const existingOd = odByEmail.get(key)
      const odEligLimit = odEligByEmail.get(key) || 0

      let smsMessage = ''
      let emailKind: 'loan' | 'none' = 'none'

      if (existingLoan) {
        // Top-up logic: must have paid >= 50% of original
        const original = Number(existingLoan.original_loan_amount || existingLoan.loan_amount || 0)
        const paid = Number(existingLoan.paid_amount || 0)
        const remaining = Number(existingLoan.remaining_balance || 0)
        if (original > 0 && paid >= original * 0.5 && maxLoan > remaining) {
          const topup = Math.max(0, maxLoan - remaining)
          if (topup >= 50000) {
            smsMessage = `${BRAND}: Dear ${emp.name}, great repayment record! You qualify for a loan TOP-UP of up to UGX ${fmt(topup)}. Apply on the app → My Wallet → Quick Loan. T&Cs apply.`
          }
        }
      } else if (maxLoan >= 50000) {
        smsMessage = `${BRAND}: Dear ${emp.name}, you are pre-qualified for a Quick Loan of up to UGX ${fmt(maxLoan)} (${multiplier}x salary). Apply on the app → My Wallet → Quick Loan. T&Cs apply.`
        emailKind = 'loan'
      }

      // Overdraft offer — appended or standalone
      if (existingOd) {
        const unused = Math.max(0, Number(existingOd.approved_limit || 0) - Number(existingOd.outstanding_balance || 0))
        if (unused >= 20000) {
          const odLine = `You also have UGX ${fmt(unused)} unused Overdraft. Tap your wallet to use it anytime.`
          smsMessage = smsMessage ? `${smsMessage} ${odLine}` : `${BRAND}: Dear ${emp.name}, ${odLine}`
        }
      } else if (odEligLimit >= 20000 && !smsMessage) {
        smsMessage = `${BRAND}: Dear ${emp.name}, you qualify for an Overdraft of up to UGX ${fmt(odEligLimit)}. Apply on the app → Overdraft. Pay small access fee. T&Cs apply.`
      }

      if (!smsMessage) { skipped++; continue }

      results.push({ name: emp.name, phone: emp.phone, email: emp.email, message: smsMessage, emailKind })

      if (dryRun) continue

      const { error: smsErr } = await supabase.functions.invoke('send-sms', {
        body: { phone: emp.phone, message: smsMessage, userName: emp.name, messageType: 'loan_reminder' },
      })
      if (!smsErr) smsSent++

      if (emailKind === 'loan') {
        await supabase.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'loan-promotion',
            recipientEmail: emp.email,
            idempotencyKey: `loan-mkt-${emp.id}-${new Date().toISOString().slice(0,10)}`,
            templateData: {
              employeeName: emp.name,
              maxLoanAmount: maxLoan,
              tenureMonths,
              salary,
              multiplier: `${multiplier}x`,
              interestRate: 10,
              maxRepaymentMonths: 6,
              loginUrl: LOGIN_URL,
            },
          },
        })
        emailSent++
      }
    }

    return new Response(JSON.stringify({
      success: true,
      total_employees: employees?.length || 0,
      sms_sent: smsSent,
      emails_sent: emailSent,
      skipped,
      dryRun,
      sample: results.slice(0, 10),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    console.error('loan-marketing-broadcast error:', e)
    return new Response(JSON.stringify({ success: false, error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})