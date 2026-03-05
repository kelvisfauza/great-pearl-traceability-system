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
    console.log(`🏦 Processing loan repayments for ${today}`)

    // Get all active loans with due repayments today (or overdue)
    const { data: dueRepayments, error: repErr } = await supabase
      .from('loan_repayments')
      .select('*, loans(*)')
      .eq('status', 'pending')
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

      console.log(`\n💰 Processing repayment #${repayment.installment_number} for ${borrowerEmail}: UGX ${amountDue}`)

      try {
        // Step 1: Get borrower's unified user ID and wallet balance
        const { data: borrowerUserId } = await supabase.rpc('get_unified_user_id', { input_email: borrowerEmail })
        
        if (!borrowerUserId) {
          console.error(`❌ Cannot resolve user ID for ${borrowerEmail}`)
          failedCount++
          continue
        }

        // Get borrower's loyalty wallet balance (same types as dashboard)
        const { data: walletEntries } = await supabase
          .from('ledger_entries')
          .select('amount')
          .eq('user_id', borrowerUserId)
          .in('entry_type', ['LOYALTY_REWARD', 'BONUS', 'DEPOSIT', 'WITHDRAWAL', 'ADJUSTMENT'])

        const walletBalance = (walletEntries || []).reduce((sum: number, e: any) => sum + Number(e.amount), 0)
        console.log(`  Wallet balance: UGX ${walletBalance}`)

        let remainingAmount = amountDue
        let deductedFromWallet = 0
        let deductedFromSalary = 0
        let deductedFromGuarantor = 0
        let deductionSources: string[] = []

        // Step 2: Deduct from wallet first
        if (walletBalance > 0) {
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
              description: `Loan repayment installment ${repayment.installment_number}`
            }
          })
          deductionSources.push(`Wallet: UGX ${deductedFromWallet.toLocaleString()}`)
          console.log(`  ✅ Deducted UGX ${deductedFromWallet} from wallet`)
        }

        // Step 3: If wallet insufficient, deduct from salary balance
        if (remainingAmount > 0) {
          // Get borrower's full balance including salary
          const { data: allEntries } = await supabase
            .from('ledger_entries')
            .select('amount')
            .eq('user_id', borrowerUserId)

          const totalBalance = (allEntries || []).reduce((sum: number, e: any) => sum + Number(e.amount), 0)
          const salaryBalance = totalBalance - walletBalance + deductedFromWallet // salary portion

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
            // Get guarantor's total balance
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
        const repaymentStatus = isFullyPaid ? 'paid' : (totalCollected > 0 ? 'partial' : 'overdue')

        // Update repayment record
        await supabase.from('loan_repayments').update({
          amount_paid: totalCollected,
          paid_date: isFullyPaid ? today : null,
          status: repaymentStatus,
          deducted_from: deductionSources.join('; '),
          payment_reference: `AUTO-${today}`
        }).eq('id', repayment.id)

        // Update loan paid_amount and remaining_balance
        const newPaidAmount = (loan.paid_amount || 0) + totalCollected
        const newRemainingBalance = loan.total_repayable - newPaidAmount

        const loanUpdate: any = {
          paid_amount: newPaidAmount,
          remaining_balance: Math.max(0, newRemainingBalance),
        }

        // Check if loan is fully paid off
        if (newRemainingBalance <= 0) {
          loanUpdate.status = 'paid_off'
          console.log(`  🎉 Loan fully paid off!`)
        } else {
          // Set next deduction date based on repayment frequency
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
        const smsMessage = isFullyPaid
          ? `Dear ${loan.employee_name}, your loan repayment of UGX ${amountDue.toLocaleString()} (installment ${repayment.installment_number}/${loan.duration_months}) has been processed. Sources: ${deductionSources.join(', ')}. Remaining balance: UGX ${Math.max(0, newRemainingBalance).toLocaleString()}. - Great Pearl Coffee`
          : remainingAmount > 0 && totalCollected > 0
          ? `Dear ${loan.employee_name}, partial loan repayment of UGX ${totalCollected.toLocaleString()} collected (installment ${repayment.installment_number}). UGX ${remainingAmount.toLocaleString()} still outstanding. Please top up your wallet. - Great Pearl Coffee`
          : `Dear ${loan.employee_name}, your loan repayment of UGX ${amountDue.toLocaleString()} (installment ${repayment.installment_number}) is OVERDUE. Insufficient funds in all sources. Please top up immediately. - Great Pearl Coffee`

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
