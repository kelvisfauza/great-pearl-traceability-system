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

    const today = new Date().toISOString().split('T')[0]
    const todayDate = new Date(today)
    console.log(`🏦 Processing loan repayments for ${today}`)

    // Get all active loans with due repayments today (or overdue)
    const { data: dueRepayments, error: repErr } = await supabase
      .from('loan_repayments')
      .select('*, loans(*)')
      .in('status', ['pending', 'overdue'])
      .lte('due_date', today)
      .order('due_date', { ascending: true })

    if (repErr) {
      console.error('Error fetching due repayments:', repErr)
      throw repErr
    }

    if (!dueRepayments || dueRepayments.length === 0) {
      console.log('✅ No due repayments found')
      return new Response(JSON.stringify({ success: true, message: 'No due repayments', processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`📋 Found ${dueRepayments.length} due repayments`)

    let processedCount = 0
    let failedCount = 0
    const results: any[] = []

    for (const repayment of dueRepayments) {
      const loan = repayment.loans
      if (!loan || loan.status !== 'active') continue

      const amountDue = repayment.amount_due
      const borrowerEmail = loan.employee_email
      const guarantorEmail = loan.guarantor_email

      // Calculate overdue weeks and penalty (20% per week, max 2 weeks = 40%)
      const dueDate = new Date(repayment.due_date)
      const overdueDays = Math.max(0, Math.floor((todayDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)))
      const overdueWeeks = Math.min(2, Math.floor(overdueDays / 7)) // cap at 2 weeks
      
      // 20% penalty per overdue week, minus any penalty already applied
      const totalPenaltyRate = overdueWeeks * 0.20
      const grossPenalty = Math.round(amountDue * totalPenaltyRate)
      const previouslyAppliedPenalty = repayment.penalty_applied || 0
      const penaltyAmount = Math.max(0, grossPenalty - previouslyAppliedPenalty) // only add the new portion
      const totalOwed = amountDue + grossPenalty - (repayment.amount_paid || 0)

      console.log(`\n💰 Processing repayment #${repayment.installment_number} for ${borrowerEmail}: UGX ${amountDue} (overdue ${overdueDays} days, penalty UGX ${penaltyAmount})`)

      try {
        // Step 1: Get borrower's unified user ID and wallet balance
        const { data: borrowerUserId } = await supabase.rpc('get_unified_user_id', { input_email: borrowerEmail })
        
        if (!borrowerUserId) {
          console.error(`❌ Cannot resolve user ID for ${borrowerEmail}`)
          failedCount++
          continue
        }

        // Get borrower's loyalty wallet balance
        const { data: walletEntries } = await supabase
          .from('ledger_entries')
          .select('amount')
          .eq('user_id', borrowerUserId)
          .in('entry_type', ['LOYALTY_REWARD', 'BONUS', 'DEPOSIT', 'WITHDRAWAL', 'ADJUSTMENT'])

        const walletBalance = (walletEntries || []).reduce((sum: number, e: any) => sum + Number(e.amount), 0)
        console.log(`  Wallet balance: UGX ${walletBalance}`)

        let remainingAmount = totalOwed
        let deductedFromWallet = 0
        let deductedFromSalary = 0
        let deductedFromGuarantor = 0
        let deductionSources: string[] = []

        // Step 2: Deduct from wallet first
        if (walletBalance > 0 && remainingAmount > 0) {
          deductedFromWallet = Math.min(walletBalance, remainingAmount)
          remainingAmount -= deductedFromWallet

          await supabase.from('ledger_entries').insert({
            user_id: borrowerUserId,
            entry_type: 'WITHDRAWAL',
            amount: -deductedFromWallet,
            reference: `LOAN-REPAY-${loan.id}-${repayment.installment_number}`,
            metadata: {
              loan_id: loan.id,
              installment: repayment.installment_number,
              source: 'wallet',
              penalty_included: penaltyAmount,
              description: `Loan repayment installment ${repayment.installment_number}${penaltyAmount > 0 ? ` (incl. penalty UGX ${penaltyAmount})` : ''}`
            }
          })
          deductionSources.push(`Wallet: UGX ${deductedFromWallet.toLocaleString()}`)
          console.log(`  ✅ Deducted UGX ${deductedFromWallet} from wallet`)
        }

        // Step 3: If wallet insufficient, deduct from salary balance
        if (remainingAmount > 0) {
          const { data: allEntries } = await supabase
            .from('ledger_entries')
            .select('amount')
            .eq('user_id', borrowerUserId)

          const totalBalance = (allEntries || []).reduce((sum: number, e: any) => sum + Number(e.amount), 0)
          const salaryBalance = totalBalance - walletBalance + deductedFromWallet

          if (salaryBalance > 0) {
            deductedFromSalary = Math.min(salaryBalance, remainingAmount)
            remainingAmount -= deductedFromSalary

            await supabase.from('ledger_entries').insert({
              user_id: borrowerUserId,
              entry_type: 'ADJUSTMENT',
              amount: -deductedFromSalary,
              reference: `LOAN-REPAY-SALARY-${loan.id}-${repayment.installment_number}`,
              metadata: {
                loan_id: loan.id,
                installment: repayment.installment_number,
                source: 'salary',
                description: `Loan repayment from salary balance`
              }
            })
            deductionSources.push(`Salary: UGX ${deductedFromSalary.toLocaleString()}`)
            console.log(`  ✅ Deducted UGX ${deductedFromSalary} from salary balance`)
          }
        }

        // Step 4: If still insufficient, deduct from guarantor
        if (remainingAmount > 0 && guarantorEmail) {
          console.log(`  ⚠️ Borrower insufficient, recovering from guarantor: ${guarantorEmail}`)

          const { data: guarantorUserId } = await supabase.rpc('get_unified_user_id', { input_email: guarantorEmail })

          if (guarantorUserId) {
            const { data: guarantorEntries } = await supabase
              .from('ledger_entries')
              .select('amount')
              .eq('user_id', guarantorUserId)

            const guarantorBalance = (guarantorEntries || []).reduce((sum: number, e: any) => sum + Number(e.amount), 0)

            if (guarantorBalance > 0) {
              deductedFromGuarantor = Math.min(guarantorBalance, remainingAmount)
              remainingAmount -= deductedFromGuarantor

              await supabase.from('ledger_entries').insert({
                user_id: guarantorUserId,
                entry_type: 'ADJUSTMENT',
                amount: -deductedFromGuarantor,
                reference: `LOAN-GUARANTOR-${loan.id}-${repayment.installment_number}`,
                metadata: {
                  loan_id: loan.id,
                  installment: repayment.installment_number,
                  borrower: borrowerEmail,
                  source: 'guarantor',
                  description: `Guarantor recovery for ${loan.employee_name}'s loan`
                }
              })
              deductionSources.push(`Guarantor: UGX ${deductedFromGuarantor.toLocaleString()}`)
              console.log(`  ✅ Deducted UGX ${deductedFromGuarantor} from guarantor`)

              // SMS to guarantor
              await supabase.functions.invoke('send-sms', {
                body: {
                  phone: loan.guarantor_phone,
                  message: `Dear ${loan.guarantor_name}, UGX ${deductedFromGuarantor.toLocaleString()} has been deducted from your account to cover ${loan.employee_name}'s loan repayment (installment ${repayment.installment_number}). Borrower had insufficient funds. - Great Pearl Coffee`,
                  userName: loan.guarantor_name,
                  messageType: 'guarantor_recovery'
                }
              })
            }
          }
        }

        const totalCollected = deductedFromWallet + deductedFromSalary + deductedFromGuarantor
        const isFullyPaid = remainingAmount <= 0
        const repaymentStatus = isFullyPaid ? 'paid' : 'overdue'

        // Update repayment record
        await supabase.from('loan_repayments').update({
          amount_paid: (repayment.amount_paid || 0) + totalCollected,
          paid_date: isFullyPaid ? today : null,
          status: repaymentStatus,
          deducted_from: deductionSources.join('; '),
          payment_reference: `AUTO-${today}`,
          penalty_applied: penaltyAmount,
          overdue_days: overdueDays
        }).eq('id', repayment.id)

        // Update loan paid_amount and remaining_balance
        const newPaidAmount = (loan.paid_amount || 0) + totalCollected
        const newRemainingBalance = loan.total_repayable + (loan.penalty_amount || 0) + penaltyAmount - newPaidAmount

        const loanUpdate: any = {
          paid_amount: newPaidAmount,
          remaining_balance: Math.max(0, newRemainingBalance),
          penalty_amount: (loan.penalty_amount || 0) + penaltyAmount,
        }

        // Track missed installments and escalation
        if (!isFullyPaid) {
          const newMissedCount = (loan.missed_installments || 0) + (repayment.status === 'pending' ? 1 : 0) // only count first miss
          loanUpdate.missed_installments = newMissedCount

          // After 1 missed installment → mark as defaulted (blocks new loans)
          if (newMissedCount >= 1) {
            loanUpdate.is_defaulted = true
            console.log(`  🚨 Loan marked as DEFAULTED after ${newMissedCount} missed installment(s)`)
          }
        }

        // Check if loan is fully paid off
        if (newRemainingBalance <= 0) {
          loanUpdate.status = 'paid_off'
          loanUpdate.is_defaulted = false
          loanUpdate.missed_installments = 0
          console.log(`  🎉 Loan fully paid off!`)
        } else {
          // Set next deduction date
          const isWeekly = loan.repayment_frequency === 'weekly'
          const nextDate = new Date(today)
          if (isWeekly) {
            nextDate.setDate(nextDate.getDate() + 7)
          } else {
            nextDate.setMonth(nextDate.getMonth() + 1)
            nextDate.setDate(1)
          }
          loanUpdate.next_deduction_date = nextDate.toISOString().split('T')[0]
        }

        await supabase.from('loans').update(loanUpdate).eq('id', loan.id)

        // SMS to borrower
        const penaltyNote = penaltyAmount > 0 ? ` (includes late penalty of UGX ${penaltyAmount.toLocaleString()})` : ''
        const smsMessage = isFullyPaid
          ? `Dear ${loan.employee_name}, your loan repayment of UGX ${totalCollected.toLocaleString()}${penaltyNote} (installment ${repayment.installment_number}) has been processed. Sources: ${deductionSources.join(', ')}. Remaining: UGX ${Math.max(0, newRemainingBalance).toLocaleString()}. - Great Pearl Coffee`
          : `Dear ${loan.employee_name}, your loan repayment of UGX ${amountDue.toLocaleString()} (installment ${repayment.installment_number}) is OVERDUE${penaltyNote}. Only UGX ${totalCollected.toLocaleString()} could be recovered. Outstanding: UGX ${remainingAmount.toLocaleString()}. Late interest continues to accrue daily. Please top up immediately. New loan requests are BLOCKED until cleared. - Great Pearl Coffee`

        await supabase.functions.invoke('send-sms', {
          body: {
            phone: loan.employee_phone,
            message: smsMessage,
            userName: loan.employee_name,
            messageType: 'loan_repayment'
          }
        })

        processedCount++
        results.push({
          loan_id: loan.id,
          borrower: borrowerEmail,
          installment: repayment.installment_number,
          amount_due: amountDue,
          penalty: penaltyAmount,
          collected: totalCollected,
          shortfall: remainingAmount,
          sources: deductionSources,
          status: repaymentStatus
        })

      } catch (err) {
        console.error(`❌ Error processing repayment for ${borrowerEmail}:`, err)
        failedCount++
      }
    }

    console.log(`\n🏦 Loan repayment processing complete: ${processedCount} processed, ${failedCount} failed`)

    return new Response(JSON.stringify({
      success: true,
      date: today,
      processed: processedCount,
      failed: failedCount,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error in process-loan-repayments:', error)
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
