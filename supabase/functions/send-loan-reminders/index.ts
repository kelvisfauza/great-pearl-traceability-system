import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    console.log(`Loan reminder check for ${todayStr}`)

    // Find installments due in 0, 1, 2, or 3 days
    const reminderDays = [0, 1, 2, 3]
    const targetDates = reminderDays.map(d => {
      const date = new Date(today)
      date.setDate(date.getDate() + d)
      return date.toISOString().split('T')[0]
    })

    const { data: dueInstallments, error } = await supabase
      .from('loan_repayments')
      .select('*, loans!inner(employee_name, employee_phone, employee_email, status)')
      .in('status', ['pending', 'partial'])
      .in('due_date', targetDates)
      .order('due_date', { ascending: true })

    if (error) {
      console.error('Error fetching installments:', error)
      throw error
    }

    if (!dueInstallments || dueInstallments.length === 0) {
      console.log('No installments due in the next 3 days')
      return new Response(JSON.stringify({ success: true, reminders_sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`Found ${dueInstallments.length} installments to remind`)

    let sentCount = 0
    const messages: any[] = []

    for (const inst of dueInstallments) {
      const loan = inst.loans
      if (!loan || loan.status !== 'active') continue

      const dueDate = new Date(inst.due_date)
      const diffDays = Math.round((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      const remaining = inst.amount_due - (inst.amount_paid || 0)

      if (remaining <= 0) continue

      // Format due date as "12 Mar 2026"
      const dueDateFormatted = dueDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

      let message = ''
      if (diffDays === 0) {
        message = `GREAT AGRO COFFEE: Dear ${loan.employee_name}, your loan installment ${inst.installment_number} of UGX ${remaining.toLocaleString()} is DUE TODAY (${dueDateFormatted}). Please clear it to avoid penalties. Pay via wallet or contact admin.`
      } else if (diffDays === 1) {
        message = `GREAT AGRO COFFEE: Dear ${loan.employee_name}, your loan installment ${inst.installment_number} of UGX ${remaining.toLocaleString()} is due TOMORROW (${dueDateFormatted}). Please ensure funds are available in your wallet.`
      } else if (diffDays === 2) {
        message = `GREAT AGRO COFFEE: Dear ${loan.employee_name}, reminder that your loan installment ${inst.installment_number} of UGX ${remaining.toLocaleString()} is due in 2 days (${dueDateFormatted}). Prepare your payment.`
      } else if (diffDays === 3) {
        message = `GREAT AGRO COFFEE: Dear ${loan.employee_name}, your loan installment ${inst.installment_number} of UGX ${remaining.toLocaleString()} is due in 3 days (${dueDateFormatted}). Please prepare to clear this amount.`
      }

      if (!message) continue

      // Send SMS
      const { error: smsErr } = await supabase.functions.invoke('send-sms', {
        body: { phone: loan.employee_phone, message, userName: loan.employee_name, messageType: 'loan_reminder' }
      })
      if (smsErr) { console.error(`SMS failed for ${loan.employee_name}:`, smsErr) } else { sentCount++; console.log(`Reminder sent to ${loan.employee_name}`) }

      // Send email reminder
      await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'loan-reminder',
          recipientEmail: loan.employee_email,
          idempotencyKey: `loan-reminder-${loan.id}-${inst.installment_number}-${todayStr}`,
          templateData: {
            employeeName: loan.employee_name,
            installmentAmount: remaining.toLocaleString(),
            dueDate: dueDateFormatted,
            installmentNumber: String(inst.installment_number),
            remainingBalance: (loan.remaining_balance || 0).toLocaleString(),
          },
        },
      })

      messages.push({
        employee: loan.employee_name,
        phone: loan.employee_phone,
        installment: inst.installment_number,
        amount: remaining,
        due_date: inst.due_date,
        days_before: diffDays,
        message,
        sent: !smsErr
      })
    }

    console.log(`Loan reminders complete: ${sentCount} sent`)

    return new Response(JSON.stringify({
      success: true,
      date: todayStr,
      reminders_sent: sentCount,
      messages
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error in send-loan-reminders:', error)
    return new Response(JSON.stringify({ success: false, error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
