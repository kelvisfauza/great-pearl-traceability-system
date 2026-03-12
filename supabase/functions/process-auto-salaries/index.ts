import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    const currentMonth = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    
    console.log(`🚀 Auto-salary processing started for ${currentMonth}`);

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

        const netSalary = grossSalary - totalAdvanceDeduction;

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
            transaction_id: `AUTO-SAL-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${emp.name.replace(/\s/g, '').substring(0, 6).toUpperCase()}`,
          })
          .select()
          .single();

        if (paymentError) {
          console.error(`❌ Failed to create payment for ${emp.name}:`, paymentError);
          errors.push({ employee: emp.name, error: paymentError.message });
          continue;
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
          const salaryDescription = `Monthly Salary - ${currentMonth}${totalAdvanceDeduction > 0 ? ` (Advance deduction: UGX ${totalAdvanceDeduction.toLocaleString()})` : ''}`;
          const { error: ledgerError } = await supabase
            .from('ledger_entries')
            .insert({
              user_id: ledgerUserId,
              entry_type: 'DEPOSIT',
              amount: netSalary,
              reference: `SAL-${paymentRecord.id}`,
              metadata: {
                description: salaryDescription,
                reference_type: 'salary_payment',
                reference_id: paymentRecord.id,
                performed_by: 'Auto-Salary System',
                gross_salary: grossSalary,
                advance_deduction: totalAdvanceDeduction,
                net_salary: netSalary,
              },
            });

          if (ledgerError) {
            console.error(`❌ Failed to credit wallet for ${emp.name}:`, ledgerError);
            errors.push({ employee: emp.name, error: `Ledger: ${ledgerError.message}` });
          } else {
            console.log(`💰 Credited ${emp.name}: UGX ${netSalary.toLocaleString()} (Gross: ${grossSalary.toLocaleString()}, Advance deduction: ${totalAdvanceDeduction.toLocaleString()})`);
          }
        } else {
          console.warn(`⚠️ No auth user found for ${emp.name} (${emp.email}) - wallet not credited`);
          errors.push({ employee: emp.name, error: 'No auth user ID found' });
        }

        // 5. Send SMS notification
        if (emp.phone) {
          let smsMessage = `Dear ${emp.name}, your salary for ${currentMonth} has been credited to your wallet.\nGross: UGX ${grossSalary.toLocaleString()}`;
          if (totalAdvanceDeduction > 0) {
            smsMessage += `\nAdvance Deduction: UGX ${totalAdvanceDeduction.toLocaleString()}`;
          }
          smsMessage += `\nNet Credited: UGX ${netSalary.toLocaleString()}\n\nGreat Pearl Coffee.`;

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
            console.log(`📱 SMS sent to ${emp.name}`);
          } catch (smsErr) {
            console.warn(`⚠️ SMS failed for ${emp.name} (non-blocking):`, smsErr);
          }
        }

        results.push({
          employee: emp.name,
          status: 'processed',
          gross: grossSalary,
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
