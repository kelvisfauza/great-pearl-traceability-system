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
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const now = new Date()
    const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    console.log(`Processing monthly allowances for ${monthYear}`)

    // Get all active allowance configs
    const { data: allowances, error: fetchErr } = await supabase
      .from('monthly_allowances')
      .select('*')
      .eq('is_active', true)

    if (fetchErr) {
      throw new Error(`Failed to fetch allowances: ${fetchErr.message}`)
    }

    console.log(`Found ${allowances?.length || 0} active allowance configs`)

    let processed = 0
    let smsSent = 0
    const errors: string[] = []

    for (const allowance of (allowances || [])) {
      try {
        // Check if already processed this month
        const { data: existing } = await supabase
          .from('monthly_allowance_log')
          .select('id')
          .eq('employee_email', allowance.employee_email)
          .eq('allowance_type', allowance.allowance_type)
          .eq('month_year', monthYear)
          .maybeSingle()

        if (existing) {
          console.log(`Already processed ${allowance.allowance_type} for ${allowance.employee_name} this month`)
          continue
        }

        // Get employee to find their user_id for ledger
        const { data: employee } = await supabase
          .from('employees')
          .select('id, auth_user_id, phone, email')
          .eq('email', allowance.employee_email)
          .eq('status', 'Active')
          .maybeSingle()

        if (!employee) {
          console.log(`Employee not found or inactive: ${allowance.employee_email}`)
          continue
        }

        // Resolve unified user ID
        const { data: unifiedId } = await supabase.rpc('get_unified_user_id', {
          user_email: allowance.employee_email
        })

        const userId = unifiedId || employee.auth_user_id || employee.id
        const typeLabel = allowance.allowance_type === 'data_allowance' ? 'Data Allowance' : 'Airtime Allowance'
        const reference = `${allowance.allowance_type.toUpperCase()}-${monthYear}-${employee.id}`

        // Credit the wallet via ledger
        const { error: ledgerErr } = await supabase
          .from('ledger_entries')
          .insert({
            user_id: String(userId),
            entry_type: 'DEPOSIT',
            amount: allowance.amount,
            reference,
            metadata: {
              allowance_type: allowance.allowance_type,
              employee_name: allowance.employee_name,
              month_year: monthYear,
              description: `Monthly ${typeLabel}`
            },
            created_at: new Date().toISOString()
          })

        if (ledgerErr) {
          errors.push(`Ledger error for ${allowance.employee_name}: ${ledgerErr.message}`)
          continue
        }

        // Send SMS notification
        let smsSuccess = false
        if (employee.phone) {
          try {
            const smsMessage = `Dear ${allowance.employee_name}, your monthly ${typeLabel} of UGX ${allowance.amount.toLocaleString()} has been credited to your wallet. - Great Agro Coffee`

            const { error: smsErr } = await supabase.functions.invoke('send-sms', {
              body: {
                phone: employee.phone,
                message: smsMessage,
                userName: allowance.employee_name,
                messageType: 'monthly_allowance',
                recipientEmail: allowance.employee_email
              }
            })

            if (!smsErr) {
              smsSuccess = true
              smsSent++
            } else {
              console.error(`SMS failed for ${allowance.employee_name}:`, smsErr)
            }
          } catch (smsError) {
            console.error(`SMS error for ${allowance.employee_name}:`, smsError)
          }
        }

        // Send detailed email notification
        try {
          await supabase.functions.invoke('send-transactional-email', {
            body: {
              templateName: 'allowance-credited',
              recipientEmail: allowance.employee_email,
              idempotencyKey: `allowance-${allowance.id}-${monthYear}`,
              templateData: {
                employeeName: allowance.employee_name,
                allowanceType: typeLabel,
                amount: allowance.amount.toLocaleString(),
                month: monthYear,
              },
            },
          })
        } catch (emailErr) {
          console.error(`Email failed for ${allowance.employee_name}:`, emailErr)
        }

        // Also create in-app notification directly
        try {
          await supabase.from('notifications').insert({
            type: 'system',
            title: `${typeLabel} Credited`,
            message: `Your monthly ${typeLabel} of UGX ${allowance.amount.toLocaleString()} has been credited to your wallet for ${monthYear}.`,
            priority: 'medium',
            target_user_id: employee.id,
            target_department: null,
            is_read: false
          })
        } catch (notifErr) {
          console.error(`In-app notification failed for ${allowance.employee_name}:`, notifErr)
        }

        // Log the processing
        await supabase.from('monthly_allowance_log').insert({
          employee_email: allowance.employee_email,
          employee_name: allowance.employee_name,
          allowance_type: allowance.allowance_type,
          amount: allowance.amount,
          ledger_reference: reference,
          sms_sent: smsSuccess,
          month_year: monthYear
        })

        processed++
        console.log(`Processed ${typeLabel} of UGX ${allowance.amount} for ${allowance.employee_name}`)
      } catch (err) {
        errors.push(`Error for ${allowance.employee_name}: ${err.message}`)
      }
    }

    const result = {
      success: true,
      month_year: monthYear,
      total_configs: allowances?.length || 0,
      processed,
      sms_sent: smsSent,
      errors: errors.length > 0 ? errors : undefined
    }

    console.log('Monthly allowances result:', JSON.stringify(result))

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Monthly allowances error:', error)
    return new Response(JSON.stringify({ success: false, error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
