import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { yoSendAirtime, normalizePhone } from '../_shared/yo-payments.ts'

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
    let yoSent = 0
    let yoFailed = 0
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

        // Push allowance directly to phone via Yo Payments (acsendairtimemobile)
        if (!employee.phone) {
          errors.push(`No phone for ${allowance.employee_name} — skipped Yo airtime payout`)
          continue
        }

        const cleanPhone = normalizePhone(employee.phone)
        const yoResult = await yoSendAirtime({
          phone: cleanPhone,
          amount: Number(allowance.amount),
          narrative: `Monthly ${typeLabel} ${monthYear} - Great Agro Coffee`,
        })

        const isPending22 = yoResult.statusMessage?.includes('-22') ||
          (yoResult.rawResponse || '').includes('<StatusCode>-22</StatusCode>')
        const yoOk = yoResult.success || isPending22

        if (yoOk) {
          yoSent++
        } else {
          yoFailed++
          errors.push(`Yo airtime failed for ${allowance.employee_name}: ${yoResult.errorMessage || 'unknown'}`)
          continue
        }

        // Audit trail in ledger (no wallet effect — recorded as PAYOUT)
        await supabase.from('ledger_entries').insert({
          user_id: String(userId),
          entry_type: 'PAYOUT',
          amount: allowance.amount,
          reference,
          metadata: {
            allowance_type: allowance.allowance_type,
            employee_name: allowance.employee_name,
            month_year: monthYear,
            yo_reference: yoResult.transactionRef || null,
            yo_status: isPending22 ? 'pending_approval' : 'success',
            disbursement_method: 'yo_airtime',
            phone: cleanPhone,
            description: `Monthly ${typeLabel} sent as airtime to ${cleanPhone}`,
          },
          created_at: new Date().toISOString(),
        })

        // Send SMS notification
        let smsSuccess = false
        if (employee.phone) {
          try {
            const smsMessage = `Dear ${allowance.employee_name}, your monthly ${typeLabel} of UGX ${allowance.amount.toLocaleString()} has been sent as airtime to ${cleanPhone}. - Great Agro Coffee`

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
                disbursementMethod: 'Airtime to phone',
                phone: cleanPhone,
                yoReference: yoResult.transactionRef || 'N/A',
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
            title: `${typeLabel} Sent`,
            message: `Your monthly ${typeLabel} of UGX ${allowance.amount.toLocaleString()} has been sent as airtime to ${cleanPhone} for ${monthYear}.`,
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
          ledger_reference: yoResult.transactionRef || reference,
          sms_sent: smsSuccess,
          month_year: monthYear
        })

        processed++
        console.log(`Sent ${typeLabel} airtime UGX ${allowance.amount} to ${allowance.employee_name} (${cleanPhone}) ref=${yoResult.transactionRef}`)
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
      yo_sent: yoSent,
      yo_failed: yoFailed,
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
