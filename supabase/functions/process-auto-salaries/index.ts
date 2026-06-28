import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { calculatePayroll } from '../_shared/statutory.ts';
import { yoPayout, normalizePhone } from '../_shared/yo-payments.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const body = await req.json().catch(() => ({}));
    const payrollRunId: string | null = body?.payrollRunId || null;
    const currentMonth: string = body?.month || now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    
    console.log(`🚀 Auto-salary processing started for ${currentMonth}`);

    // Load tax profiles once
    const { data: taxProfiles } = await supabase
      .from('employee_tax_profile')
      .select('employee_id, nssf_exempt, paye_exempt');
    const profileMap = new Map<string, any>();
    for (const p of taxProfiles || []) profileMap.set(String(p.employee_id), p);

    // 1. Get all active employees
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, name, email, salary, phone, department, auth_user_id, employee_id')
      .eq('status', 'Active')
      .not('is_training_account', 'eq', true);

    if (empError) throw new Error(`Failed to fetch employees: ${empError.message}`);
    if (!employees || employees.length === 0) {
      return new Response(JSON.stringify({ message: 'No active employees found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`📋 Found ${employees.length} active employees`);

    const results: any[] = [];
    const errors: any[] = [];

    for (const emp of employees) {
      try {
        // Skip super admin / system accounts
        if (emp.email === 'operations@greatpearlcoffee.com') {
          console.log(`⏭️ Skipping system account: ${emp.name}`);
          continue;
        }

        // Check if salary already processed this month
        const { data: existingPayment } = await supabase
          .from('employee_salary_payments')
          .select('id')
          .eq('employee_email', emp.email)
          .eq('payment_month', currentMonth)
          .eq('payment_label', 'FULL SALARY')
          .in('status', ['completed', 'processing'])
          .limit(1);

        if (existingPayment && existingPayment.length > 0) {
          console.log(`⏭️ Salary already processed for ${emp.name} in ${currentMonth}`);
          results.push({ employee: emp.name, status: 'skipped', reason: 'Already processed' });
          continue;
        }

        const grossSalary = emp.salary || 0;
        if (grossSalary <= 0) {
          console.log(`⏭️ No salary configured for ${emp.name}`);
          results.push({ employee: emp.name, status: 'skipped', reason: 'No salary' });
          continue;
        }

        // Statutory deductions
        const profile = profileMap.get(String(emp.id)) || profileMap.get(String(emp.employee_id)) || {};
        const stat = calculatePayroll(grossSalary, { nssfExempt: !!profile.nssf_exempt, payeExempt: !!profile.paye_exempt });

        // 2. Check for active salary advances
        let totalAdvanceDeduction = 0;
        let advanceId: string | null = null;
        const advanceDetails: any[] = [];

        const { data: activeAdvances } = await supabase
          .from('employee_salary_advances')
          .select('*')
          .eq('employee_email', emp.email)
          .eq('status', 'active')
          .gt('remaining_balance', 0);

        if (activeAdvances && activeAdvances.length > 0) {
          for (const advance of activeAdvances) {
            const deduction = Math.min(advance.minimum_payment, advance.remaining_balance);
            totalAdvanceDeduction += deduction;
            advanceId = advance.id; // Last one for reference

            advanceDetails.push({
              advance_id: advance.id,
              original_amount: advance.original_amount,
              remaining_before: advance.remaining_balance,
              deduction: deduction,
              remaining_after: advance.remaining_balance - deduction,
            });

            // Update advance balance
            const newBalance = advance.remaining_balance - deduction;
            const newStatus = newBalance <= 0 ? 'paid_off' : 'active';

            const { error: updateError } = await supabase
              .from('employee_salary_advances')
              .update({
                remaining_balance: Math.max(0, newBalance),
                status: newStatus,
                updated_at: new Date().toISOString(),
              })
              .eq('id', advance.id);

            if (updateError) {
              console.error(`❌ Failed to update advance ${advance.id}:`, updateError);
            } else {
              console.log(`✅ Advance ${advance.id} updated: balance ${advance.remaining_balance} -> ${Math.max(0, newBalance)} (${newStatus})`);
            }

            // Create payment record for the advance
            await supabase
              .from('salary_advance_payments')
              .insert({
                advance_id: advance.id,
                employee_email: emp.email,
                amount_paid: deduction,
                status: 'approved',
                approved_by: 'Auto-Salary System',
              });
          }
        }

        const netSalary = Math.max(0, stat.net - totalAdvanceDeduction);

        // 2b. Active loan installment recovery (e.g. pure_salary loan monthly installment)
        let totalLoanDeduction = 0;
        const loanDetails: any[] = [];
        try {
          const { data: activeLoans } = await supabase
            .from('loans')
            .select('id, monthly_installment, remaining_balance, paid_amount, loan_type')
            .eq('employee_email', emp.email)
            .eq('status', 'active')
            .gt('remaining_balance', 0);

          if (activeLoans && activeLoans.length > 0) {
            // Budget cap: don't push net below zero from loans alone
            let remainingBudget = Math.max(0, netSalary - totalLoanDeduction);
            for (const loan of activeLoans) {
              const installment = Number(loan.monthly_installment) || 0;
              const deduction = Math.min(installment, Number(loan.remaining_balance), remainingBudget);
              if (deduction <= 0) continue;
              totalLoanDeduction += deduction;
              remainingBudget -= deduction;

              const newRemaining = Math.max(0, Number(loan.remaining_balance) - deduction);
              const newPaid = Number(loan.paid_amount || 0) + deduction;
              const newStatus = newRemaining <= 0 ? 'paid_off' : 'active';

              await supabase.from('loans').update({
                paid_amount: newPaid,
                remaining_balance: newRemaining,
                status: newStatus,
                updated_at: new Date().toISOString(),
              }).eq('id', loan.id);

              // Update next pending installment
              const { data: nextInst } = await supabase
                .from('loan_repayments')
                .select('id, amount_due, amount_paid')
                .eq('loan_id', loan.id)
                .in('status', ['pending', 'partial'])
                .order('installment_number', { ascending: true })
                .limit(1)
                .maybeSingle();
              if (nextInst) {
                const paidNow = Number(nextInst.amount_paid || 0) + deduction;
                const fullyPaid = paidNow >= Number(nextInst.amount_due);
                await supabase.from('loan_repayments').update({
                  amount_paid: paidNow,
                  status: fullyPaid ? 'paid' : 'partial',
                  paid_date: fullyPaid ? new Date().toISOString() : null,
                  deducted_from: `Salary - ${currentMonth}`,
                  payment_reference: `AUTO-SAL-LOAN-${loan.id}-${currentMonth.replace(/\s/g,'')}`,
                  updated_at: new Date().toISOString(),
                }).eq('id', nextInst.id);
              }

              loanDetails.push({
                loan_id: loan.id,
                loan_type: loan.loan_type,
                deduction,
                remaining_after: newRemaining,
                status_after: newStatus,
              });
              console.log(`💳 Loan ${loan.id} deduction: UGX ${deduction.toLocaleString()} (remaining ${newRemaining})`);
            }
          }
        } catch (loanErr) {
          console.error(`⚠️ Loan deduction error for ${emp.name}:`, loanErr);
        }

        const netAfterLoans = Math.max(0, netSalary - totalLoanDeduction);

        // 2c. Salary remittance agreement (e.g. portion of net sent to a third party via Yo Payments)
        let remittanceAmount = 0;
        let remittanceInfo: any = null;
        try {
          const { data: agreement } = await supabase
            .from('salary_remittance_agreements')
            .select('*')
            .eq('employee_email', emp.email)
            .eq('status', 'active')
            .maybeSingle();

          if (agreement && netAfterLoans > 0) {
            const pct = Number(agreement.percentage) || 0;
            remittanceAmount = Math.round((netAfterLoans * pct) / 100);
            if (remittanceAmount > 0) {
              const recipientPhone = normalizePhone(agreement.recipient_phone);
              const narrative = `Salary remittance - ${emp.name} - ${currentMonth}`;
              const payout = await yoPayout({ phone: recipientPhone, amount: remittanceAmount, narrative });

              remittanceInfo = {
                recipient_name: agreement.recipient_name,
                recipient_phone: agreement.recipient_phone,
                percentage: pct,
                amount: remittanceAmount,
                yo_status: payout.success ? 'success' : 'failed',
                yo_reference: payout.transactionRef || null,
                yo_error: payout.errorMessage || null,
              };

              await supabase.from('salary_remittance_payments').insert({
                agreement_id: agreement.id,
                payroll_run_id: payrollRunId,
                employee_email: emp.email,
                month: currentMonth,
                net_salary: netAfterLoans,
                percentage: pct,
                amount: remittanceAmount,
                yo_reference: payout.transactionRef || null,
                yo_status: payout.success ? 'success' : 'failed',
                yo_raw_response: payout.rawResponse ? { raw: payout.rawResponse, error: payout.errorMessage || null } : { error: payout.errorMessage || null },
              });

              if (!payout.success) {
                // Payout failed — do NOT deduct from wallet; credit full net instead
                console.error(`❌ Remittance payout failed for ${emp.name}: ${payout.errorMessage}`);
                remittanceAmount = 0;
              } else {
                console.log(`💸 Remittance sent: UGX ${remittanceAmount.toLocaleString()} to ${agreement.recipient_name} (${recipientPhone})`);
              }
            }
          }
        } catch (remErr) {
          console.error(`⚠️ Remittance processing error for ${emp.name}:`, remErr);
        }

        const walletCredit = Math.max(0, netAfterLoans - remittanceAmount);

        // 3. Create salary payment record
        const { data: paymentRecord, error: paymentError } = await supabase
          .from('employee_salary_payments')
          .insert({
            employee_id: emp.employee_id || emp.id,
            employee_email: emp.email,
            employee_name: emp.name,
            employee_phone: emp.phone,
            salary_amount: grossSalary,
            gross_salary: grossSalary,
            nssf_employee: stat.nssfEmployee,
            nssf_employer: stat.nssfEmployer,
            nssf_total: stat.nssfTotal,
            taxable_income: stat.taxableIncome,
            paye: stat.paye,
            advance_deduction: totalAdvanceDeduction,
            advance_id: advanceId,
            time_deduction: 0,
            time_deduction_hours: 0,
            net_salary: netSalary,
            payment_month: currentMonth,
            payment_label: 'FULL SALARY',
            payment_method: 'wallet',
            processed_by: 'Auto-Salary System',
            processed_by_email: 'system@greatpearlcoffee.com',
            status: 'completed',
            completed_at: new Date().toISOString(),
            completed_by: 'Auto-Salary System',
            payroll_run_id: payrollRunId,
            disbursement_reference: `AUTO-SAL-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${emp.name.replace(/\s/g, '').substring(0, 6).toUpperCase()}`,
            transaction_id: `AUTO-SAL-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${emp.name.replace(/\s/g, '').substring(0, 6).toUpperCase()}`,
          })
          .select()
          .single();

        if (paymentError) {
          console.error(`❌ Failed to create payment for ${emp.name}:`, paymentError);
          errors.push({ employee: emp.name, error: paymentError.message });
          continue;
        }

        // 3b. Statutory liabilities (always recorded — exempt entries skipped because amount=0)
        const statutoryRows = [
          { type: 'nssf_employee', amount: stat.nssfEmployee },
          { type: 'nssf_employer', amount: stat.nssfEmployer },
          { type: 'paye',          amount: stat.paye },
        ].filter(r => r.amount > 0).map(r => ({
          payroll_run_id: payrollRunId,
          salary_payment_id: paymentRecord.id,
          employee_id: String(emp.employee_id || emp.id),
          employee_name: emp.name,
          employee_email: emp.email,
          month: currentMonth,
          type: r.type,
          amount: r.amount,
          status: 'pending',
        }));
        if (statutoryRows.length) {
          const { error: statErr } = await supabase.from('statutory_liabilities').insert(statutoryRows);
          if (statErr) console.error(`❌ Statutory write failed for ${emp.name}:`, statErr);
        }

        // 4. Credit employee wallet via ledger entry
        // Resolve the user_id for ledger
        let ledgerUserId = emp.auth_user_id;
        if (!ledgerUserId) {
          // Try to find auth user by email
          const { data: authUser } = await supabase.auth.admin.listUsers();
          const matchedUser = authUser?.users?.find((u: any) => u.email === emp.email);
          if (matchedUser) {
            ledgerUserId = matchedUser.id;
          }
        }

        if (ledgerUserId) {
          const salaryDescription = `Monthly Salary - ${currentMonth}${totalAdvanceDeduction > 0 ? ` (Advance deduction: UGX ${totalAdvanceDeduction.toLocaleString()})` : ''}${remittanceAmount > 0 ? ` (Remittance: UGX ${remittanceAmount.toLocaleString()})` : ''}`;
          const { error: ledgerError } = await supabase
            .from('ledger_entries')
            .insert({
              user_id: ledgerUserId,
              entry_type: 'DEPOSIT',
              amount: walletCredit,
              reference: `SAL-${paymentRecord.id}`,
              metadata: {
                description: salaryDescription,
                reference_type: 'salary_payment',
                reference_id: paymentRecord.id,
                performed_by: 'Auto-Salary System',
                gross_salary: grossSalary,
                advance_deduction: totalAdvanceDeduction,
                net_salary: netSalary,
                remittance_amount: remittanceAmount,
                remittance: remittanceInfo,
                wallet_credited: walletCredit,
              },
            });

          if (ledgerError) {
            console.error(`❌ Failed to credit wallet for ${emp.name}:`, ledgerError);
            errors.push({ employee: emp.name, error: `Ledger: ${ledgerError.message}` });
          } else {
            console.log(`💰 Credited ${emp.name}: UGX ${walletCredit.toLocaleString()} (Gross: ${grossSalary.toLocaleString()}, Advance: ${totalAdvanceDeduction.toLocaleString()}, Remittance: ${remittanceAmount.toLocaleString()})`);
          }
        } else {
          console.warn(`⚠️ No auth user found for ${emp.name} (${emp.email}) - wallet not credited`);
          errors.push({ employee: emp.name, error: 'No auth user ID found' });
        }

        const transactionId = `AUTO-SAL-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${emp.name.replace(/\s/g, '').substring(0, 6).toUpperCase()}`;
        const statutoryDeductions = Number(stat.nssfEmployee || 0) + Number(stat.paye || 0);
        const payrollDeductions = Number(totalAdvanceDeduction || 0) + Number(totalLoanDeduction || 0);
        const totalDeductions = statutoryDeductions + payrollDeductions;

        // 5a. Send SMS notification without blocking the email notice
        if (emp.phone) {
          const smsMessage = totalDeductions > 0
            ? `${emp.name}, salary ${currentMonth} paid. Gross UGX ${grossSalary.toLocaleString()}, deductions UGX ${totalDeductions.toLocaleString()}, wallet UGX ${walletCredit.toLocaleString()}. Great Pearl Coffee`
            : `${emp.name}, salary ${currentMonth} UGX ${walletCredit.toLocaleString()} credited to wallet. Great Pearl Coffee`;

          try {
            await supabase.functions.invoke('send-sms', {
              body: {
                phone: emp.phone,
                message: smsMessage,
                userName: emp.name,
                messageType: 'salary',
                triggeredBy: 'Auto-Salary System',
                department: emp.department,
                recipientEmail: emp.email,
              },
            });
            console.log(`📱 Salary SMS sent to ${emp.name}`);
          } catch (smsErr) {
            console.warn(`⚠️ Salary SMS failed for ${emp.name} (non-blocking):`, smsErr);
          }
        }

        // 5b. Always send detailed salary email for valid employee emails
        if (emp.email && emp.email.includes('@')) {
          let payslipUrl = '';
          try {
            const { data: payslipResult } = await supabase.functions.invoke('generate-payslip', {
              body: {
                employeeName: emp.name,
                employeeEmail: emp.email,
                employeeId: emp.employee_id || emp.id,
                department: emp.department || '',
                month: currentMonth,
                grossSalary,
                advanceDeduction: totalAdvanceDeduction + totalLoanDeduction,
                netSalary: walletCredit,
                nssfEmployee: stat.nssfEmployee,
                nssfEmployer: stat.nssfEmployer,
                paye: stat.paye,
                taxableIncome: stat.taxableIncome,
                paymentMethod: 'Wallet',
                transactionId,
                processedDate: now.toLocaleDateString('en-UG', { year: 'numeric', month: 'long', day: 'numeric' }),
                advanceDetails: [...advanceDetails, ...loanDetails],
              },
            });
            payslipUrl = payslipResult?.url || '';
            console.log(`📄 Payslip generated for ${emp.name}: ${payslipUrl}`);
          } catch (payslipErr) {
            console.warn(`⚠️ Payslip generation failed for ${emp.name} (non-blocking):`, payslipErr);
          }

          const { error: emailErr } = await supabase.functions.invoke('send-transactional-email', {
            body: {
              templateName: 'salary-credited',
              recipientEmail: emp.email,
              idempotencyKey: `salary-paid-${emp.email}-${currentMonth}`,
              templateData: {
                employeeName: emp.name,
                month: currentMonth,
                grossSalary: grossSalary.toLocaleString(),
                advanceDeduction: totalAdvanceDeduction.toLocaleString(),
                loanDeduction: totalLoanDeduction.toLocaleString(),
                netSalary: netAfterLoans.toLocaleString(),
                hasDeductions: payrollDeductions > 0,
                department: emp.department || '',
                transactionId,
                payslipUrl,
                hasRemittance: remittanceAmount > 0,
                remittanceAmount: remittanceAmount.toLocaleString(),
                remittanceRecipient: remittanceInfo?.recipient_name || '',
                remittancePhone: remittanceInfo?.recipient_phone || '',
                remittancePercentage: remittanceInfo?.percentage || 0,
                walletCredited: walletCredit.toLocaleString(),
                nssfEmployee: Number(stat.nssfEmployee || 0).toLocaleString(),
                nssfEmployer: Number(stat.nssfEmployer || 0).toLocaleString(),
                paye: Number(stat.paye || 0).toLocaleString(),
                totalDeductions: totalDeductions.toLocaleString(),
              },
            },
          });

          if (emailErr) {
            console.warn(`⚠️ Salary email failed for ${emp.name} (non-blocking):`, emailErr);
          } else {
            console.log(`📧 Salary email sent to ${emp.name}`);
          }
        } else {
          console.warn(`⚠️ Salary email skipped for ${emp.name}: invalid email ${emp.email}`);
        }

        results.push({
          employee: emp.name,
          status: 'processed',
          gross: grossSalary,
          nssfEmployee: stat.nssfEmployee,
          nssfEmployer: stat.nssfEmployer,
          paye: stat.paye,
          advanceDeduction: totalAdvanceDeduction,
          net: netSalary,
          advances: advanceDetails,
        });
      } catch (empErr) {
        console.error(`❌ Error processing ${emp.name}:`, empErr);
        errors.push({ employee: emp.name, error: String(empErr) });
      }
    }

    const summary = {
      processed_at: now.toISOString(),
      month: currentMonth,
      total_employees: employees.length,
      processed: results.filter((r) => r.status === 'processed').length,
      skipped: results.filter((r) => r.status === 'skipped').length,
      errors: errors.length,
      results,
      errors_detail: errors,
    };

    console.log(`✅ Auto-salary processing complete:`, JSON.stringify(summary, null, 2));

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('❌ Auto-salary processing failed:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
