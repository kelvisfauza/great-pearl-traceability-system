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
    const currentMonth = todayDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })
    console.log(`🏦 Processing loan repayments for ${today} (${currentMonth})`)

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
      const overdueWeeks = Math.min(2, Math.floor(overdueDays / 7))
      
      const totalPenaltyRate = overdueWeeks * 0.20
      const grossPenalty = Math.round(amountDue * totalPenaltyRate)
      const previouslyAppliedPenalty = repayment.penalty_applied || 0
      const penaltyAmount = Math.max(0, grossPenalty - previouslyAppliedPenalty)
      const totalOwed = amountDue + grossPenalty - (repayment.amount_paid || 0)

      console.log(`\n💰 Processing repayment #${repayment.installment_number} for ${borrowerEmail}: UGX ${amountDue} (overdue ${overdueDays} days, penalty UGX ${penaltyAmount})`)

      try {
        // Resolve borrower user ID
        const { data: borrowerUserId } = await supabase.rpc('get_unified_user_id', { input_email: borrowerEmail })
        
        if (!borrowerUserId) {
          console.error(`❌ Cannot resolve user ID for ${borrowerEmail}`)
          failedCount++
          continue
        }

        // Get borrower's wallet balance
        const { data: walletEntries } = await supabase
          .from('ledger_entries')
          .select('amount')
          .eq('user_id', borrowerUserId)

        const walletBalance = (walletEntries || []).reduce((sum: number, e: any) => sum + Number(e.amount), 0)
        console.log(`  Wallet balance: UGX ${walletBalance}`)

        let remainingAmount = totalOwed
        let deductedFromWallet = 0
        let deductedFromGuarantor = 0
        let deductedFromSalary = 0
        let salaryAdvanceCreated = false
        let deductionSources: string[] = []

        // ═══════════════════════════════════════════════════
        // STEP 1: Deduct from borrower's WALLET
        // ═══════════════════════════════════════════════════
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

        // ═══════════════════════════════════════════════════
        // STEP 2: Deduct from GUARANTOR's wallet
        // ═══════════════════════════════════════════════════
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

        // ═══════════════════════════════════════════════════
        // STEP 3: SALARY RECOVERY (last resort)
        // Auto-create salary advance if employee hasn't been
        // paid this month yet — deducted from next payroll
        // ═══════════════════════════════════════════════════
        if (remainingAmount > 0) {
          console.log(`  💼 Attempting salary recovery for UGX ${remainingAmount}...`)

          // Check if employee has already been paid salary this month
          const { data: salaryThisMonth } = await supabase
            .from('employee_salary_payments')
            .select('id, status')
            .eq('employee_email', borrowerEmail)
            .eq('payment_month', currentMonth)
            .in('status', ['completed', 'processing'])
            .limit(1)

          const alreadyPaid = salaryThisMonth && salaryThisMonth.length > 0

          if (alreadyPaid) {
            console.log(`  ⚠️ Salary already paid for ${currentMonth} — cannot create salary advance`)
          } else {
            // Get employee's gross salary to determine available headroom
            const { data: employeeRecord } = await supabase
              .from('employees')
              .select('name, salary')
              .eq('email', borrowerEmail)
              .single()

            const grossSalary = employeeRecord?.salary || 0

            if (grossSalary > 0) {
              // Check existing active salary advances to calculate remaining salary headroom
              const { data: existingAdvances } = await supabase
                .from('employee_salary_advances')
                .select('remaining_balance, minimum_payment')
                .eq('employee_email', borrowerEmail)
                .eq('status', 'active')

              const totalExistingAdvanceDeductions = (existingAdvances || []).reduce(
                (sum: number, a: any) => sum + (a.minimum_payment || 0), 0
              )

              // Standard deductions (PAYE, NSSF etc) — use company_employees if available
              const { data: companyEmp } = await supabase
                .from('company_employees')
                .select('base_salary, deductions, allowances')
                .ilike('full_name', `%${(employeeRecord?.name || '').split(' ').pop()}%`)
                .limit(1)

              const standardDeductions = companyEmp?.[0]?.deductions || 0

              // Net available from salary = gross - standard deductions - existing advance payments
              const netAvailable = grossSalary - standardDeductions - totalExistingAdvanceDeductions
              
              // Cap salary recovery at what's actually available (minimum UGX 5,000 to be meaningful)
              const salaryRecoveryAmount = Math.min(remainingAmount, Math.max(0, netAvailable))

              if (salaryRecoveryAmount >= 5000) {
                // Create an auto salary advance for the loan recovery amount
                const { data: newAdvance, error: advanceErr } = await supabase
                  .from('employee_salary_advances')
                  .insert({
                    employee_email: borrowerEmail,
                    employee_name: loan.employee_name,
                    original_amount: salaryRecoveryAmount,
                    remaining_balance: salaryRecoveryAmount,
                    minimum_payment: salaryRecoveryAmount, // full deduction in one month
                    reason: `Auto loan recovery – Loan installment #${repayment.installment_number} (${loan.loan_type}). Ref: ${loan.id.slice(0, 8)}`,
                    status: 'active',
                    created_by: 'System (Loan Recovery)',
                  })
                  .select()
                  .single()

                if (advanceErr) {
                  console.error(`  ❌ Failed to create salary advance:`, advanceErr)
                } else {
                  deductedFromSalary = salaryRecoveryAmount
                  remainingAmount -= salaryRecoveryAmount
                  salaryAdvanceCreated = true
                  deductionSources.push(`Salary Advance: UGX ${salaryRecoveryAmount.toLocaleString()} (deducted from ${currentMonth} payroll)`)
                  console.log(`  ✅ Created salary advance of UGX ${salaryRecoveryAmount} (advance ID: ${newAdvance.id})`)

                  // Note: No wallet credit here — this is a future salary deduction, not a wallet movement.
                  // The amount will be deducted when payroll runs on the 27th.
                }
              } else {
                console.log(`  ⚠️ Salary headroom too low (UGX ${Math.max(0, netAvailable)}) — skipping salary recovery`)
              }
            } else {
              console.log(`  ⚠️ No salary record found for ${borrowerEmail} — skipping salary recovery`)
            }
          }
        }

        const totalCollected = deductedFromWallet + deductedFromGuarantor + deductedFromSalary
        const isFullyPaid = remainingAmount <= 0
        const repaymentStatus = isFullyPaid ? 'paid' : 'overdue'

        // Update repayment record
        await supabase.from('loan_repayments').update({
          amount_paid: (repayment.amount_paid || 0) + totalCollected,
          paid_date: isFullyPaid ? today : null,
          status: repaymentStatus,
          deducted_from: deductionSources.join('; '),
          payment_reference: `AUTO-${today}`,
          penalty_applied: grossPenalty,
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
          const newMissedCount = (loan.missed_installments || 0) + (repayment.status === 'pending' ? 1 : 0)
          loanUpdate.missed_installments = newMissedCount

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
        const penaltyNote = grossPenalty > 0 ? ` (penalty: 20% x ${overdueWeeks} week(s) = UGX ${grossPenalty.toLocaleString()})` : ''
        const salaryNote = salaryAdvanceCreated ? ` A salary advance has been auto-created — this will be deducted from your ${currentMonth} salary.` : ''
        
        const smsMessage = isFullyPaid
          ? `Dear ${loan.employee_name}, your loan repayment of UGX ${totalCollected.toLocaleString()}${penaltyNote} (installment ${repayment.installment_number}) has been processed. Sources: ${deductionSources.join(', ')}. Remaining: UGX ${Math.max(0, newRemainingBalance).toLocaleString()}.${salaryNote} - Great Pearl Coffee`
          : `Dear ${loan.employee_name}, installment ${repayment.installment_number} of UGX ${amountDue.toLocaleString()} is ${overdueWeeks > 0 ? `${overdueWeeks} week(s) OVERDUE` : 'DUE'}${penaltyNote}. Recovered UGX ${totalCollected.toLocaleString()} from ${deductionSources.length > 0 ? deductionSources.join(', ') : 'no sources'}. Still owed: UGX ${remainingAmount.toLocaleString()}.${salaryNote} Penalty increases each week (max 2 weeks). New loans BLOCKED. - Great Pearl Coffee`

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
          salary_advance_created: salaryAdvanceCreated,
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
      month: currentMonth,
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
