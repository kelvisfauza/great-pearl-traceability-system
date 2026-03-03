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
    const dayOfWeek = now.getUTCDay() // 0=Sun, 6=Sat
    
    // Only run Monday(1) to Saturday(6)
    if (dayOfWeek === 0) {
      return new Response(JSON.stringify({ message: 'Sunday - no deductions', processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const today = now.toISOString().split('T')[0]
    const DEDUCTION_AMOUNT = 5000

    // Get all active employees
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, email, name, auth_user_id, phone')
      .eq('status', 'Active')

    if (empError) throw empError

    let processed = 0
    const deducted: string[] = []
    const skipped: string[] = []

    for (const emp of employees || []) {
      if (!emp.auth_user_id) {
        skipped.push(`${emp.name} (no auth_user_id)`)
        continue
      }

      // Check if employee logged into the system today BEFORE 9AM EAT (6AM UTC)
      // Uses the dedicated employee_login_tracker table
      const { data: loginRecord } = await supabase
        .from('employee_login_tracker')
        .select('id, login_time')
        .eq('auth_user_id', emp.auth_user_id)
        .eq('login_date', today)
        .maybeSingle()

      if (loginRecord) {
        // Employee logged into the system today
        const loginTime = new Date(loginRecord.login_time)
        const loginHourUTC = loginTime.getUTCHours()
        const loginMinuteUTC = loginTime.getUTCMinutes()
        
        // 9:00 AM EAT = 6:00 AM UTC
        if (loginHourUTC < 6 || (loginHourUTC === 6 && loginMinuteUTC === 0)) {
          skipped.push(`${emp.name} (logged in at ${loginTime.toISOString()} - before 9AM EAT)`)
          continue
        }
        
        // Logged in but AFTER 9AM EAT - still deduct
        console.log(`${emp.name} logged in late at ${loginTime.toISOString()} (after 9AM EAT)`)
      } else {
        // No login record at all for today
        console.log(`${emp.name} has no login record for ${today}`)
      }

      // Also check user_sessions as a fallback
      const { data: session } = await supabase
        .from('user_sessions')
        .select('id, created_at')
        .eq('user_id', emp.auth_user_id)
        .gte('created_at', today + 'T00:00:00Z')
        .lte('created_at', today + 'T06:00:00Z') // 9AM EAT = 6AM UTC
        .limit(1)
        .maybeSingle()

      if (session) {
        skipped.push(`${emp.name} (session found before 9AM)`)
        continue
      }

      // Check if already deducted today
      const { data: existing } = await supabase
        .from('absence_appeals')
        .select('id')
        .eq('employee_id', emp.id)
        .eq('deduction_date', today)
        .maybeSingle()

      if (existing) {
        skipped.push(`${emp.name} (already deducted)`)
        continue
      }

      // Get unified user ID
      const { data: userIdData } = await supabase
        .rpc('get_unified_user_id', { input_email: emp.email })
      const userId = userIdData || emp.auth_user_id || emp.id

      const referenceKey = `AUTO-ABSENCE-${today}-${emp.id}`

      // Create negative ledger entry (allows negative balance)
      const { error: ledgerError } = await supabase
        .from('ledger_entries')
        .insert({
          user_id: userId,
          entry_type: 'ADJUSTMENT',
          amount: -DEDUCTION_AMOUNT,
          reference: referenceKey,
          metadata: {
            type: 'auto_absence_deduction',
            employee_name: emp.name,
            employee_email: emp.email,
            date: today,
            reason: loginRecord 
              ? `Logged into system late at ${new Date(loginRecord.login_time).toISOString()} (after 9:00 AM EAT)`
              : 'Not logged into system by 9:00 AM EAT',
          }
        })

      if (ledgerError) {
        console.error(`Failed to deduct for ${emp.name}:`, ledgerError)
        continue
      }

      // Create absence_appeals record for tracking and appeal
      await supabase
        .from('absence_appeals')
        .insert({
          employee_id: emp.id,
          employee_name: emp.name,
          employee_email: emp.email,
          deduction_date: today,
          deduction_amount: DEDUCTION_AMOUNT,
          ledger_reference: referenceKey,
          appeal_status: 'none',
          reason: loginRecord
            ? `Late login at ${new Date(loginRecord.login_time).toLocaleTimeString('en-US', { timeZone: 'Africa/Kampala' })}`
            : 'No system login recorded before 9:00 AM',
        })

      // Send SMS notification
      if (emp.phone) {
        const smsMessage = loginRecord
          ? `Great Pearl Coffee: UGX ${DEDUCTION_AMOUNT.toLocaleString()} deducted - you logged into the system late today (${today}). Login was after 9:00 AM. You can appeal under My Deductions.`
          : `Great Pearl Coffee: UGX ${DEDUCTION_AMOUNT.toLocaleString()} deducted - you did not log into the system by 9:00 AM today (${today}). You can appeal under My Deductions.`

        try {
          await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              phone: emp.phone,
              to: emp.phone,
              message: smsMessage,
            }),
          })

          await supabase
            .from('absence_appeals')
            .update({ sms_sent: true })
            .eq('employee_id', emp.id)
            .eq('deduction_date', today)
        } catch (smsErr) {
          console.error(`SMS failed for ${emp.name}:`, smsErr)
        }
      }

      // Also queue SMS via notification queue
      await supabase
        .from('sms_notification_queue')
        .insert({
          recipient_phone: emp.phone || '',
          recipient_email: emp.email,
          message: `Great Pearl Coffee: UGX ${DEDUCTION_AMOUNT.toLocaleString()} deducted for not logging in by 9AM on ${today}. Appeal via system.`,
          notification_type: 'absence_deduction',
          reference_id: referenceKey,
        })

      deducted.push(emp.name)
      processed++
    }

    console.log(`Auto-deduction complete: ${processed} employees deducted, ${skipped.length} skipped on ${today}`)

    return new Response(JSON.stringify({
      success: true,
      date: today,
      processed,
      deducted,
      skipped_count: skipped.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Auto-deduction error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
